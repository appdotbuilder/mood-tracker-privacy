import { type Medication, type UserDataQuery } from '../schema';

export const getMedications = async (query: UserDataQuery): Promise<Medication[]> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all medications for a specific user.
    // This will display the user's medication list for tracking and logging.
    return Promise.resolve([]);
};

export const getActiveMedications = async (query: UserDataQuery): Promise<Medication[]> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching only active medications for a user.
    // This will be used for quick logging and reminder setup.
    return Promise.resolve([]);
};