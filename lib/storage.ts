import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { requiredEnv } from "./env";
export function storage() {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"), secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY") },
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
  });
}
export function bucket(){return requiredEnv("S3_BUCKET");}
