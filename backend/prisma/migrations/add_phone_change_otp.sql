-- Add phone change OTP fields to User table
ALTER TABLE "User" ADD COLUMN "phoneChangeOtp" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneChangeOtpExpires" DATETIME;
ALTER TABLE "User" ADD COLUMN "newPhoneNumber" TEXT;
