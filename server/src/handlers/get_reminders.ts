import { type Reminder, type UserDataQuery } from '../schema';

export const getReminders = async (query: UserDataQuery): Promise<Reminder[]> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all reminders for a specific user.
    // This will display the user's configured reminders for management.
    return Promise.resolve([]);
};

export const getActiveReminders = async (query: UserDataQuery): Promise<Reminder[]> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching only active reminders for a user.
    // This will be used by the reminder system to trigger notifications.
    return Promise.resolve([]);
};