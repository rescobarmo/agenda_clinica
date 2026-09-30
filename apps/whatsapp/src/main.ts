import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { Worker } from "bullmq";
import { QUEUE_NAMES } from "@agenda/shared";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv();

const connection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};

const worker = new Worker(
  QUEUE_NAMES.WHATSAPP_MESSAGES,
  async (job) => {
    console.log(`[whatsapp] procesando job ${job.id}:`, job.data);
    // TODO: integrar Meta WhatsApp Cloud API para el envío real.
    // Plantillas aprobadas, reintentos y registro de resultados.
  },
  {
    connection,
    concurrency: 10,
  },
);

worker.on("completed", (job) => {
  console.log(`[whatsapp] job ${job.id} completado`);
});

worker.on("failed", (job, err) => {
  console.error(`[whatsapp] job ${job?.id} falló:`, err.message);
});

console.log("[whatsapp] worker iniciado, esperando mensajes...");
