export default async function run(page, ui) {
  // Scroll down to see the promos section
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(2000);
  
  // Take screenshot
  await page.screenshot({ path: 'promos-view.png', fullPage: false });
  
  return { scrolled: true, message: 'Scrolled to promos section' };
}