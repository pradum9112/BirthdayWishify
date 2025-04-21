import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailLogLean {
  name: string;
  dob: string;
  email: string;
  sentAt: string; // Actual send timestamp (ISO)
  sentAtDate: string; // Date string for deduplication
}

export interface IEmailLog extends IEmailLogLean, Document {}

const EmailLogSchema: Schema = new Schema({
  name: { type: String, required: true },
  dob: { type: String, required: true },
  email: { type: String, required: true },
  sentAt: { type: String, required: true },
  sentAtDate: { type: String, required: true },
});

// Ensure unique email+date per day
EmailLogSchema.index({ email: 1, sentAtDate: 1 }, { unique: true });

export default mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
