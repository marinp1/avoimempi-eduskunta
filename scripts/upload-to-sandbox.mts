import path from "path";
import { $ } from "bun";

const INSTANCE_IP = "sandbox.patrikmarin.fi";
const APP_FOLDER = "~/avoimempi-eduskunta";

await $`scp -r ${path.join(
  import.meta.dirname,
  "../migrations"
)} \[${INSTANCE_IP}\]:${APP_FOLDER}`;

await $`scp ${path.join(
  import.meta.dirname,
  "../docker-compose.yml"
)} \[${INSTANCE_IP}\]:${APP_FOLDER}/docker-compose.yml`;
