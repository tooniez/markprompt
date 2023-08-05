// Utilities that run in non-edge runtimes, such as the browser or Node.
import grayMatter from 'gray-matter';
import yaml from 'js-yaml';

export const extractFrontmatter = (
  source: string,
): { [key: string]: string } => {
  try {
    const matter = grayMatter(source, {})?.matter;
    if (matter) {
      return yaml.load(matter, {
        schema: yaml.JSON_SCHEMA,
      }) as { [key: string]: string };
    }
  } catch {
    // Do nothing
  }
  return {};
};
