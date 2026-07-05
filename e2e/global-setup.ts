import { resetTestDatabase } from "../tests/helpers/db";

export default async function globalSetup() {
  resetTestDatabase();
}
