# End-to-End Testing in Lang-Tag

## Overview

The end-to-end tests in Lang-Tag are designed to verify the complete functionality of CLI commands in a realistic environment. These tests simulate actual usage scenarios by creating temporary project environments and executing the CLI commands against them.

## Test Structure

Each e2e test follows a consistent pattern:

1. **Environment Setup**: Tests create isolated test environments using utility functions from `utils.ts` that:
   - Prepare a base project template with necessary dependencies
   - Create temporary directories for each test run
   - Set up configuration files and test data

2. **Command Execution**: Tests execute CLI commands using `execSync` to run the actual commands as they would be used in a real project.

3. **Result Verification**: Tests verify the expected outcomes by:
   - Checking file existence and content
   - Validating generated output files
   - Confirming correct behavior of language tag processing

## Package Building Process

Before running the tests, a special build process is executed:

1. **Package Creation**: The `prepareMainProjectBase` function in `utils.ts` runs `npm run pack-test-build` to:
   - Build the Lang-Tag package
   - Create a tarball (.tgz file) in the dist directory
   - This tarball is then installed in the test projects

2. **Test Project Setup**: Each test project is created with:
   - A package.json that references the local tarball: `"lang-tag": "file:../dist/lang-tag.tgz"`
   - TypeScript configuration for proper module resolution
   - Mock configuration files that simulate real-world usage

3. **Dependency Installation**: The test projects run `npm install` to:
   - Install the Lang-Tag package from the local tarball
   - Set up the necessary environment for running the CLI commands

This approach ensures that the tests are using the actual built package, just as a real user would, rather than testing against the source code directly.
