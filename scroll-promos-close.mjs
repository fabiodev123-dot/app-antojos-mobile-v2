export default async function run(page, ui) {
  // Scroll to promos section
  await page.evaluate(() => {
    const promosSection = document.querySelector('section:nth-of-type(2)');
    if (promosSection) promosSection.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(1500);
  
  return { scrolled: true, message: 'Scrolled to promos section' };
}