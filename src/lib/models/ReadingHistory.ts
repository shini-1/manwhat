import mongoose, { Schema, Document } from 'mongoose';

export interface IReadingHistory extends Document {
  userId: string;
  mangaId: string;
  chapterId?: string;
  lastReadAt: Date;
  progress?: number; // e.g., percentage or page number
}

const ReadingHistorySchema: Schema = new Schema({
  userId: { type: String, required: true },
  mangaId: { type: String, required: true },
  chapterId: { type: String },
  lastReadAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 0 },
});

// Compound index for efficient queries
ReadingHistorySchema.index({ userId: 1, mangaId: 1 }, { unique: true });

export default mongoose.models.ReadingHistory || mongoose.model<IReadingHistory>('ReadingHistory', ReadingHistorySchema);
