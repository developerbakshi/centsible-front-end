export function formatCategoryName(name) {
  return name
    .toLocaleLowerCase("en-US")
    .replace(/(^|[\s-])(\p{L})/gu, (_, separator, letter) =>
      separator + letter.toLocaleUpperCase("en-US"),
    );
}
