import type { PageLoad } from './$types';

const CHANGELOG_URL = 'https://raw.githubusercontent.com/AtomiCloud/nitroso.zinc/main/Changelog.md';

export interface ChangelogChange {
  description: string;
  commitHash: string;
  commitUrl: string;
}

export interface ChangelogSection {
  category: string;
  emoji: string;
  changes: ChangelogChange[];
}

export interface ChangelogVersion {
  version: string;
  versionUrl: string;
  date: string;
  sections: ChangelogSection[];
}

export interface ChangelogData {
  versions: ChangelogVersion[];
  total: number;
}

function parseChangelog(markdown: string): ChangelogVersion[] {
  const versions: ChangelogVersion[] = [];
  const lines = markdown.split('\n');

  let currentVersion: ChangelogVersion | null = null;
  let currentSection: ChangelogSection | null = null;

  // Regex patterns
  const versionRegex = /^## \[([^\]]+)\]\(([^)]+)\) \(([^)]+)\)/;
  const sectionRegex = /^### (.) (.+) (.)$/u;
  const changeRegex = /^\* (.+) \(\[([a-f0-9]+)\]\(([^)]+)\)\)$/;

  for (const line of lines) {
    // Check for version header
    const versionMatch = line.match(versionRegex);
    if (versionMatch) {
      // Save previous version
      if (currentVersion) {
        if (currentSection) {
          currentVersion.sections.push(currentSection);
        }
        versions.push(currentVersion);
      }

      currentVersion = {
        version: versionMatch[1],
        versionUrl: versionMatch[2],
        date: versionMatch[3],
        sections: [],
      };
      currentSection = null;
      continue;
    }

    // Check for section header
    const sectionMatch = line.match(sectionRegex);
    if (sectionMatch && currentVersion) {
      // Save previous section
      if (currentSection) {
        currentVersion.sections.push(currentSection);
      }

      currentSection = {
        emoji: sectionMatch[1],
        category: sectionMatch[2],
        changes: [],
      };
      continue;
    }

    // Check for change item
    const changeMatch = line.match(changeRegex);
    if (changeMatch && currentVersion && currentSection) {
      currentSection.changes.push({
        description: changeMatch[1],
        commitHash: changeMatch[2],
        commitUrl: changeMatch[3],
      });
    }
  }

  // Save the last version
  if (currentVersion) {
    if (currentSection) {
      currentVersion.sections.push(currentSection);
    }
    versions.push(currentVersion);
  }

  return versions;
}

export const load = (async (): Promise<ChangelogData> => {
  try {
    const response = await fetch(CHANGELOG_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch changelog: ${response.status}`);
    }

    const markdown = await response.text();
    const versions = parseChangelog(markdown);

    return {
      versions,
      total: versions.length,
    };
  } catch (error) {
    console.error('Error fetching changelog:', error);
    return {
      versions: [],
      total: 0,
    };
  }
}) satisfies PageLoad;
