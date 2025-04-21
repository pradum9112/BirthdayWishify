import mongoose, { Schema, Document } from 'mongoose';

export interface IUserLean {
  name: string;
  dob: string;
  email: string;
}

export interface IUser extends IUserLean, Document {
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  dob: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
