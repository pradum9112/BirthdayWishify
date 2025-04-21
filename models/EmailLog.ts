import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailLogLean {
  name: string;
  dob: string;
  email: string;
  sentAt: string;
}

export interface IEmailLog extends IEmailLogLean, Document {
}

const EmailLogSchema: Schema = new Schema({
  name: { type: String, required: true },
  dob: { type: String, required: true },
  email: { type: String, required: true },
  sentAt: { type: String, required: true },
});

export default mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
