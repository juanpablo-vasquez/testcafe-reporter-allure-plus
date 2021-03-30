import { Severity } from 'allure-js-commons';
import { Priority } from './reporter/models';
import step from './testcafe/step';
import { loadReporterConfig } from './utils/config';

const reporterConfig = loadReporterConfig();

export { step, reporterConfig, Severity, Priority };
