import mongoose, { Schema, Document } from 'mongoose';

export interface IUserFavorites extends Document {
  userId: string;
  mangaId: string;
  addedAt: Date;
}

const UserFavoritesSchema: Schema = new Schema({
  userId: { type: String, required: true },
  mangaId: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
});

// Compound index to ensure a user can't favorite the same manga twice
UserFavoritesSchema.index({ userId: 1, mangaId: 1 }, { unique: true });

export default mongoose.models.UserFavorites || mongoose.model<IUserFavorites>('UserFavorites', UserFavoritesSchema);
