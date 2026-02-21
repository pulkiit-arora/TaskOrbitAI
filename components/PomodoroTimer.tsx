import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Task } from '../types';
import { Play, Pause, RotateCcw, X, Coffee, Timer } from 'lucide-react';

interface PomodoroTimerProps {
    task: Task;
    onClose: () => void;
    onLogTime: (seconds: number) => void;
}

type TimerPhase = 'work' | 'break' | 'idle';

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ task, onClose, onLogTime }) => {
    const [workDuration] = useState(25 * 60); // 25 min
    const [breakDuration] = useState(5 * 60); // 5 min
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [phase, setPhase] = useState<TimerPhase>('idle');
    const [isRunning, setIsRunning] = useState(false);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);
    const workedSecondsRef = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (phase === 'work') workedSecondsRef.current += 1;
                    return prev - 1;
                });
            }, 1000);
        } else if (timeLeft === 0) {
            // Phase ended
            if (phase === 'work') {
                const worked = workedSecondsRef.current;
                if (worked > 0) {
                    onLogTime(worked);
                    workedSecondsRef.current = 0;
                }
                setSessionsCompleted(prev => prev + 1);
                setPhase('break');
                setTimeLeft(breakDuration);
                setIsRunning(true);
            } else if (phase === 'break') {
                setPhase('idle');
                setTimeLeft(workDuration);
                setIsRunning(false);
            }
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeLeft, phase, workDuration, breakDuration, onLogTime]);

    const startWork = useCallback(() => {
        setPhase('work');
        setTimeLeft(workDuration);
        setIsRunning(true);
        workedSecondsRef.current = 0;
    }, [workDuration]);

    const togglePause = () => setIsRunning(prev => !prev);

    const reset = () => {
        setIsRunning(false);
        if (phase === 'work' && workedSecondsRef.current > 30) {
            onLogTime(workedSecondsRef.current);
        }
        workedSecondsRef.current = 0;
        setPhase('idle');
        setTimeLeft(workDuration);
    };

    const handleClose = () => {
        if (phase === 'work' && workedSecondsRef.current > 30) {
            onLogTime(workedSecondsRef.current);
        }
        onClose();
    };

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const totalDuration = phase === 'work' ? workDuration : phase === 'break' ? breakDuration : workDuration;
    const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

    const phaseColors = {
        work: 'from-red-500 to-orange-500',
        break: 'from-green-500 to-emerald-500',
        idle: 'from-blue-500 to-indigo-500',
    };

    return (
        <div className="fixed bottom-6 right-6 z-[150] animate-slide-up">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700
        p-5 w-72">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Timer size={16} className="text-red-500" />
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {phase === 'work' ? 'Focus' : phase === 'break' ? 'Break' : 'Ready'}
                        </span>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Task title */}
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate mb-4">{task.title}</p>

                {/* Timer display */}
                <div className="relative flex items-center justify-center mb-4">
                    <div className="w-32 h-32 relative">
                        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor"
                                className="text-gray-200 dark:text-gray-700" strokeWidth="8" />
                            <circle cx="60" cy="60" r="52" fill="none"
                                className={`text-transparent`}
                                strokeWidth="8"
                                strokeDasharray={`${2 * Math.PI * 52}`}
                                strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
                                strokeLinecap="round"
                                style={{
                                    stroke: phase === 'work' ? '#ef4444' : phase === 'break' ? '#22c55e' : '#3b82f6',
                                    transition: 'stroke-dashoffset 1s linear',
                                }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                            </span>
                            {sessionsCompleted > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    🍅 {sessionsCompleted}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${phaseColors[phase]} transition-all duration-1000 ease-linear`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                    {phase === 'idle' ? (
                        <button
                            onClick={startWork}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg
                text-sm font-medium transition-colors shadow-sm"
                        >
                            <Play size={14} /> Start Focus
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={togglePause}
                                className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200
                  dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            <button
                                onClick={reset}
                                className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200
                  dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                                <RotateCcw size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
