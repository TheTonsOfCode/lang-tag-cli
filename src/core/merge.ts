export function deepMergeTranslations(target: any, source: any): boolean {
    if (typeof target !== 'object') {
        throw new Error('Target must be an object');
    }
    if (typeof source !== 'object') {
        throw new Error('Source must be an object');
    }

    let changed = false;

    for (const key in source) {
        if (!source.hasOwnProperty(key)) {
            continue;
        }

        let targetValue = target[key];
        const sourceValue = source[key];

        if (
            typeof targetValue === 'string' &&
            typeof sourceValue === 'object'
        ) {
            throw new Error(
                `Trying to write object into target key "${key}" which is translation already`
            );
        }

        if (Array.isArray(sourceValue)) {
            throw new Error(
                `Trying to write array into target key "${key}", we do not allow arrays inside translations`
            );
        }

        if (typeof sourceValue === 'object') {
            if (!targetValue) {
                targetValue = {};
                target[key] = targetValue;
            }

            if (deepMergeTranslations(targetValue, sourceValue)) {
                changed = true;
            }
        } else {
            if (target[key] !== sourceValue) {
                changed = true;
            }
            target[key] = sourceValue;
        }
    }

    return changed;
}
