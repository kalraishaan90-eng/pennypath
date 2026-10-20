import { IPennyPathRepository } from './repository';
import { LocalSeededRepository } from './localSeededRepository';

// In demo mode or offline, use LocalSeededRepository
// If Supabase environment variables exist, can switch or sync, but fallback ensures 100% reliability
export const repository: IPennyPathRepository = new LocalSeededRepository();

export * from './repository';
export * from './localSeededRepository';
export * from './seedData';
