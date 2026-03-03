/*
  Warnings:

  - Added the required column `estimated_duration_in_seconds` to the `workout_days` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "workout_days" ADD COLUMN     "cover_image_url" TEXT,
ADD COLUMN     "estimated_duration_in_seconds" INTEGER NOT NULL;
