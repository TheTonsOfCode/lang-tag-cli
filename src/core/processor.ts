import JSON5 from 'json5';

import { LangTagCLIConfig, LangTagCLIProcessedTag } from '@/type';

export interface $LT_TagReplaceData {
  tag: LangTagCLIProcessedTag;

  translations?: string | any;
  config?: string | any;
}

export class $LT_TagProcessor {
  constructor(
    private config: Pick<LangTagCLIConfig, 'tagName' | 'translationArgPosition'>
  ) {}

  public extractTags(fileContent: string): LangTagCLIProcessedTag[] {
    const tagName = this.config.tagName;
    const optionalVariableAssignment = `(?:\\s*(\\w+)\\s*=\\s*)?`;

    // Find all potential lang tag matches
    const matches: LangTagCLIProcessedTag[] = [];
    let currentIndex = 0;

    // Build position maps for comments and strings to skip them
    const skipRanges = this.buildSkipRanges(fileContent);

    // Create a regex to find the start of a lang tag
    const startPattern = new RegExp(
      `${optionalVariableAssignment}${tagName}\\(\\s*\\{`,
      'g'
    );

    while (true) {
      // Find the next potential match
      startPattern.lastIndex = currentIndex;
      const startMatch = startPattern.exec(fileContent);

      if (!startMatch) break;

      const matchStartIndex = startMatch.index;
      const variableName = startMatch[1] || undefined;

      // Check if this match is inside a comment or string literal
      if (this.isInSkipRange(matchStartIndex, skipRanges)) {
        currentIndex = matchStartIndex + 1;
        continue;
      }

      // Find the matching closing brace for the first object
      let braceCount = 1;
      let i = matchStartIndex + startMatch[0].length;

      while (i < fileContent.length && braceCount > 0) {
        if (fileContent[i] === '{') braceCount++;
        if (fileContent[i] === '}') braceCount--;
        i++;
      }

      if (braceCount !== 0) {
        // No matching closing brace found, skip this match
        currentIndex = matchStartIndex + 1;
        continue;
      }

      // Check if there's a second parameter
      let parameter1Text = fileContent.substring(
        matchStartIndex + startMatch[0].length - 1,
        i
      );
      let parameter2Text: string | undefined;

      // After first object, we expect either ',' (then second object) or ')' (end of call)
      // Skip whitespace
      while (
        i < fileContent.length &&
        (fileContent[i] === ' ' ||
          fileContent[i] === '\n' ||
          fileContent[i] === '\t')
      ) {
        i++;
      }

      if (i >= fileContent.length) {
        // Reached EOF without finding a closing paren
        currentIndex = matchStartIndex + 1;
        continue;
      }

      if (fileContent[i] === ',') {
        // Consume comma and any whitespace after it
        i++;
        while (
          i < fileContent.length &&
          (fileContent[i] === ' ' ||
            fileContent[i] === '\n' ||
            fileContent[i] === '\t')
        ) {
          i++;
        }

        // Check if this is a trailing comma after first parameter (single parameter case)
        if (i >= fileContent.length || fileContent[i] === ')') {
          // This is a trailing comma after the first parameter only - valid case
          // We'll handle this in the closing parenthesis check below
        } else if (fileContent[i] === '{') {
          // This is the start of a second parameter
          // Parse second object
          braceCount = 1;
          const secondParamStart = i;
          i++;

          while (i < fileContent.length && braceCount > 0) {
            if (fileContent[i] === '{') braceCount++;
            if (fileContent[i] === '}') braceCount--;
            i++;
          }

          if (braceCount !== 0) {
            // Unbalanced braces - skip this match
            currentIndex = matchStartIndex + 1;
            continue;
          }

          parameter2Text = fileContent.substring(secondParamStart, i);

          // After second object, skip whitespace
          while (
            i < fileContent.length &&
            (fileContent[i] === ' ' ||
              fileContent[i] === '\n' ||
              fileContent[i] === '\t')
          ) {
            i++;
          }

          // Handle trailing comma after second parameter (Prettier formatting)
          if (i < fileContent.length && fileContent[i] === ',') {
            i++; // consume the comma
            // Skip whitespace after comma
            while (
              i < fileContent.length &&
              (fileContent[i] === ' ' ||
                fileContent[i] === '\n' ||
                fileContent[i] === '\t')
            ) {
              i++;
            }
          }
        } else {
          // Malformed: comma not followed by an object or closing paren
          currentIndex = matchStartIndex + 1;
          continue;
        }
      } else if (fileContent[i] !== ')') {
        // No comma and not a closing parenthesis -> malformed (e.g., missing comma before second object)
        currentIndex = matchStartIndex + 1;
        continue;
      }

      // Require closing parenthesis for the tag call
      if (i >= fileContent.length || fileContent[i] !== ')') {
        // Scan ahead minimally to see if a ')' appears before a line break with code; conservative: require immediate ')'
        // For simplicity, if not immediate ')', treat as malformed
        currentIndex = matchStartIndex + 1;
        continue;
      }

      // Include the closing parenthesis
      i++;

      const fullMatch = fileContent.substring(matchStartIndex, i);

      const { line, column } = getLineAndColumn(fileContent, matchStartIndex);

      let validity: any = 'ok';

      let parameter1 = undefined;
      let parameter2 = undefined;

      // Check for template string interpolation (${...}) - not allowed
      if (
        this.hasTemplateInterpolation(parameter1Text) ||
        (parameter2Text && this.hasTemplateInterpolation(parameter2Text))
      ) {
        // Skip this match - template interpolation not allowed
        currentIndex = matchStartIndex + 1;
        continue;
      }

      try {
        parameter1 = JSON5.parse(parameter1Text);
        if (parameter2Text) {
          try {
            parameter2 = JSON5.parse(parameter2Text);
          } catch (error) {
            // Try to parse with escaped newlines in strings
            try {
              parameter2 = JSON5.parse(
                this.escapeNewlinesInStrings(parameter2Text)
              );
            } catch {
              validity = 'invalid-param-2';
            }
          }
        }
      } catch (error) {
        // Try to parse with escaped newlines in strings (for multiline string support)
        try {
          parameter1 = JSON5.parse(
            this.escapeNewlinesInStrings(parameter1Text)
          );
        } catch {
          validity = 'invalid-param-1';
        }
      }

      let parameterTranslations =
        this.config.translationArgPosition === 1 ? parameter1 : parameter2;
      let parameterConfig =
        this.config.translationArgPosition === 1 ? parameter2 : parameter1;

      if (validity === 'ok') {
        if (!parameterTranslations) validity = 'translations-not-found';
      }

      matches.push({
        fullMatch,
        variableName,
        parameter1Text,
        parameter2Text,
        parameterTranslations,
        parameterConfig,
        index: matchStartIndex,
        line,
        column,
        validity,
      });

      currentIndex = i;
    }

    return matches;
  }

  public replaceTags(
    fileContent: string,
    replacements: $LT_TagReplaceData[]
  ): string {
    const replaceMap: Map<LangTagCLIProcessedTag, string> = new Map();

    replacements.forEach((R) => {
      if (!R.translations && !R.config && R.config !== null) {
        throw new Error('Replacement data is required!');
      }

      const tag = R.tag;

      let newTranslationsString = R.translations;
      // We do not use "tag.parameterTranslations" in order to preserve translations object comments, etc.
      if (!newTranslationsString)
        newTranslationsString =
          this.config.translationArgPosition === 1
            ? tag.parameter1Text
            : tag.parameter2Text || '{}';
      else if (typeof newTranslationsString !== 'string')
        newTranslationsString = JSON5.stringify(newTranslationsString);
      if (!newTranslationsString)
        throw new Error('Tag must have translations provided!');
      try {
        JSON5.parse(newTranslationsString);
      } catch (error) {
        throw new Error(
          `Tag translations are invalid object! Translations: ${newTranslationsString}`
        );
      }

      let newConfigString = R.config;
      if (!newConfigString && newConfigString !== null)
        newConfigString = tag.parameterConfig;
      if (newConfigString) {
        try {
          if (typeof newConfigString === 'string') JSON5.parse(newConfigString);
          else newConfigString = JSON5.stringify(newConfigString);
        } catch (error) {
          throw new Error(
            `Tag config is invalid object! Config: ${newConfigString}`
          );
        }
      }

      // IMPORTANT: If config is NULL and translations are on position 2, we need to set config to "{}"
      // to ensure the function call has the correct argument structure: t({}, translations)
      if (
        newConfigString === null &&
        this.config.translationArgPosition === 2
      ) {
        newConfigString = '{}';
      }

      // TODO:   HERE:  Cała logika formatowania wcięć itd w przyszłości

      const arg1 =
        this.config.translationArgPosition === 1
          ? newTranslationsString
          : newConfigString;
      const arg2 =
        this.config.translationArgPosition === 1
          ? newConfigString
          : newTranslationsString;

      let tagFunction = `${this.config.tagName}(${arg1}`;
      if (arg2) tagFunction += `, ${arg2}`;
      tagFunction += ')';

      if (tag.variableName)
        replaceMap.set(tag, ` ${tag.variableName} = ${tagFunction}`);
      else replaceMap.set(tag, tagFunction);
    });

    let offset = 0;

    replaceMap.forEach((replacement, match) => {
      const startIdx = match.index + offset;
      const endIdx = startIdx + match.fullMatch.length;

      fileContent =
        fileContent.slice(0, startIdx) +
        replacement +
        fileContent.slice(endIdx);

      offset += replacement.length - match.fullMatch.length;
    });

    return fileContent;
  }

  private buildSkipRanges(fileContent: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    let i = 0;

    while (i < fileContent.length) {
      const char = fileContent[i];
      const nextChar = fileContent[i + 1];

      // Single-line comment
      if (char === '/' && nextChar === '/') {
        const start = i;
        i += 2;
        while (i < fileContent.length && fileContent[i] !== '\n') {
          i++;
        }
        ranges.push([start, i]);
        continue;
      }

      // Block comment
      if (char === '/' && nextChar === '*') {
        const start = i;
        i += 2;
        while (i < fileContent.length - 1) {
          if (fileContent[i] === '*' && fileContent[i + 1] === '/') {
            i += 2;
            break;
          }
          i++;
        }
        ranges.push([start, i]);
        continue;
      }

      // String literals (single quote)
      if (char === "'") {
        const start = i;
        i++;
        while (i < fileContent.length) {
          if (fileContent[i] === '\\') {
            i += 2; // Skip escaped character
            continue;
          }
          if (fileContent[i] === "'") {
            i++;
            break;
          }
          i++;
        }
        ranges.push([start, i]);
        continue;
      }

      // String literals (double quote)
      if (char === '"') {
        const start = i;
        i++;
        while (i < fileContent.length) {
          if (fileContent[i] === '\\') {
            i += 2; // Skip escaped character
            continue;
          }
          if (fileContent[i] === '"') {
            i++;
            break;
          }
          i++;
        }
        ranges.push([start, i]);
        continue;
      }

      // Template literals (backtick)
      if (char === '`') {
        const start = i;
        i++;
        while (i < fileContent.length) {
          if (fileContent[i] === '\\') {
            i += 2; // Skip escaped character
            continue;
          }
          if (fileContent[i] === '`') {
            i++;
            break;
          }
          i++;
        }
        ranges.push([start, i]);
        continue;
      }

      i++;
    }

    return ranges;
  }

  private isInSkipRange(
    position: number,
    skipRanges: Array<[number, number]>
  ): boolean {
    for (const [start, end] of skipRanges) {
      if (position >= start && position < end) {
        return true;
      }
    }
    return false;
  }

  private hasTemplateInterpolation(text: string): boolean {
    // Check if the text contains template string interpolation ${...}
    // We need to be careful to only check inside backtick strings
    let i = 0;
    while (i < text.length) {
      if (text[i] === '`') {
        // Inside template literal
        i++;
        while (i < text.length) {
          if (text[i] === '\\') {
            i += 2; // Skip escaped character
            continue;
          }
          if (text[i] === '$' && text[i + 1] === '{') {
            return true; // Found interpolation
          }
          if (text[i] === '`') {
            i++;
            break;
          }
          i++;
        }
        continue;
      }
      i++;
    }
    return false;
  }

  private escapeNewlinesInStrings(text: string): string {
    // Helper method to escape literal newlines in strings for JSON5 parsing
    // This allows parsing of multiline strings that have literal newlines
    let result = '';
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      // Handle double-quoted strings
      if (char === '"') {
        result += char;
        i++;
        while (i < text.length) {
          if (text[i] === '\\') {
            // Already escaped character, keep as-is
            result += text[i] + text[i + 1];
            i += 2;
            continue;
          }
          if (text[i] === '\n') {
            // Escape the literal newline
            result += '\\n';
            i++;
            continue;
          }
          if (text[i] === '"') {
            result += text[i];
            i++;
            break;
          }
          result += text[i];
          i++;
        }
        continue;
      }

      // Handle single-quoted strings
      if (char === "'") {
        result += char;
        i++;
        while (i < text.length) {
          if (text[i] === '\\') {
            // Already escaped character, keep as-is
            result += text[i] + text[i + 1];
            i += 2;
            continue;
          }
          if (text[i] === '\n') {
            // Escape the literal newline
            result += '\\n';
            i++;
            continue;
          }
          if (text[i] === "'") {
            result += text[i];
            i++;
            break;
          }
          result += text[i];
          i++;
        }
        continue;
      }

      result += char;
      i++;
    }

    return result;
  }
}

function getLineAndColumn(
  text: string,
  matchIndex: number
): { line: number; column: number } {
  const lines = text.slice(0, matchIndex).split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}
