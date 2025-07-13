const fs = require('fs');
const path = require('path');

class log {
    constructor(component) {
        this.component = component;
        this.logDir = path.join(__dirname, 'log');
        this.debugDir = path.join(__dirname, '..', 'debug');
        
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        this.logFile = path.join(this.logDir, `${component}_${this.getDateString()}.log`);
        this.debugFile = path.join(this.debugDir, `${component}_debug.json`);
        this.sessionId = `SESSION-${Date.now()}`;
        
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };
        
        this.currentLevel = this.logLevels.INFO;
        this.debugData = this.loadDebugData();
    }

    getDateString() {
        return new Date().toISOString().split('T')[0];
    }

    loadDebugData() {
        if (fs.existsSync(this.debugFile)) {
            return JSON.parse(fs.readFileSync(this.debugFile, 'utf8'));
        }
        return { 
            breakpoints: [],
            watches: [],
            traces: [],
            performance: []
        };
    }

    saveDebugData() {
        if (!fs.existsSync(path.dirname(this.debugFile))) {
            fs.mkdirSync(path.dirname(this.debugFile), { recursive: true });
        }
        fs.writeFileSync(this.debugFile, JSON.stringify(this.debugData, null, 2));
    }

    log(level, message, data = {}) {
        if (this.logLevels[level] > this.currentLevel) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            session: this.sessionId,
            component: this.component,
            level,
            message,
            data,
            stack: level === 'ERROR' ? new Error().stack : undefined
        };

        const logLine = this.formatLogEntry(logEntry);
        fs.appendFileSync(this.logFile, logLine + '\n');

        if (level === 'ERROR' || level === 'WARN') {
            this.addToDebugTrace(logEntry);
        }

        return logEntry;
    }

    formatLogEntry(entry) {
        const base = `[${entry.timestamp}] [${entry.session}] [${entry.component}] [${entry.level}] ${entry.message}`;
        if (Object.keys(entry.data).length > 0) {
            return `${base} | ${JSON.stringify(entry.data)}`;
        }
        return base;
    }

    error(message, data) {
        return this.log('ERROR', message, data);
    }

    warn(message, data) {
        return this.log('WARN', message, data);
    }

    info(message, data) {
        return this.log('INFO', message, data);
    }

    debug(message, data) {
        return this.log('DEBUG', message, data);
    }

    trace(message, data) {
        return this.log('TRACE', message, data);
    }

    addBreakpoint(file, line, condition) {
        const breakpoint = {
            id: `BP-${Date.now()}`,
            file,
            line,
            condition,
            hits: 0,
            enabled: true,
            created_at: new Date().toISOString()
        };
        
        this.debugData.breakpoints.push(breakpoint);
        this.saveDebugData();
        return breakpoint;
    }

    addWatch(expression, context) {
        const watch = {
            id: `WATCH-${Date.now()}`,
            expression,
            context,
            values: [],
            created_at: new Date().toISOString()
        };
        
        this.debugData.watches.push(watch);
        this.saveDebugData();
        return watch;
    }

    recordWatchValue(watchId, value) {
        const watch = this.debugData.watches.find(w => w.id === watchId);
        if (watch) {
            watch.values.push({
                value,
                timestamp: new Date().toISOString()
            });
            this.saveDebugData();
        }
    }

    addToDebugTrace(entry) {
        this.debugData.traces.push({
            ...entry,
            id: `TRACE-${Date.now()}`
        });
        
        if (this.debugData.traces.length > 1000) {
            this.debugData.traces = this.debugData.traces.slice(-500);
        }
        
        this.saveDebugData();
    }

    startPerformanceTrace(operation) {
        const trace = {
            id: `PERF-${Date.now()}`,
            operation,
            started_at: Date.now(),
            completed_at: null,
            duration: null,
            memory_start: process.memoryUsage()
        };
        
        this.debugData.performance.push(trace);
        return trace.id;
    }

    endPerformanceTrace(traceId) {
        const trace = this.debugData.performance.find(t => t.id === traceId);
        if (trace) {
            trace.completed_at = Date.now();
            trace.duration = trace.completed_at - trace.started_at;
            trace.memory_end = process.memoryUsage();
            trace.memory_delta = {
                heapUsed: trace.memory_end.heapUsed - trace.memory_start.heapUsed,
                external: trace.memory_end.external - trace.memory_start.external
            };
            this.saveDebugData();
        }
    }

    getDebugSummary() {
        const recentErrors = this.debugData.traces.filter(t => 
            t.level === 'ERROR' && 
            new Date(t.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        const performanceIssues = this.debugData.performance.filter(p => 
            p.duration && p.duration > 1000
        );

        return {
            recent_errors: recentErrors.length,
            active_breakpoints: this.debugData.breakpoints.filter(b => b.enabled).length,
            active_watches: this.debugData.watches.length,
            slow_operations: performanceIssues.length,
            memory_leaks: this.detectMemoryLeaks()
        };
    }

    detectMemoryLeaks() {
        const traces = this.debugData.performance.filter(p => p.memory_delta);
        const suspiciousTraces = traces.filter(t => 
            t.memory_delta.heapUsed > 10 * 1024 * 1024 // 10MB
        );
        return suspiciousTraces.map(t => ({
            operation: t.operation,
            memory_increase: Math.round(t.memory_delta.heapUsed / 1024 / 1024) + 'MB'
        }));
    }
}

module.exports = log;