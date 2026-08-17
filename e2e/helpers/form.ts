import type { Page } from "@playwright/test";

/** Fill DatePicker / Select values posted through visually hidden named inputs. */
export async function fillNamed(page: Page, name: string, value: string) {
  await page.getByTestId(`form-value-${name}`).fill(value, { force: true });
}
