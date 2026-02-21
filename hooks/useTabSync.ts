import { useEffect, useRef } from 'react';
import { Task } from '../types';

const CHANNEL_NAME = 'taskorbit-sync';

export function useTabSync(
    tasks: Task[],
    setTasks: (tasks: Task[]) => void
) {
    const channelRef = useRef<BroadcastChannel | null>(null);
    const isExternalUpdate = useRef(false);

    useEffect(() => {
        try {
            channelRef.current = new BroadcastChannel(CHANNEL_NAME);

            channelRef.current.onmessage = (event) => {
                if (event.data?.type === 'TASKS_UPDATED' && event.data.tasks) {
                    isExternalUpdate.current = true;
                    setTasks(event.data.tasks);
                    // Reset flag after React processes the update
                    setTimeout(() => { isExternalUpdate.current = false; }, 100);
                }
            };
        } catch {
            // BroadcastChannel not supported
        }

        return () => {
            channelRef.current?.close();
        };
    }, [setTasks]);

    // Broadcast changes to other tabs
    useEffect(() => {
        if (isExternalUpdate.current) return;
        try {
            channelRef.current?.postMessage({
                type: 'TASKS_UPDATED',
                tasks,
            });
        } catch {
            // Ignore serialization errors
        }
    }, [tasks]);
}
