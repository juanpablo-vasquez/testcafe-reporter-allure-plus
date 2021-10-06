/* eslint-disable class-methods-use-this,no-param-reassign */
import { loadReporterConfig } from '../utils/config';
import * as fs from 'fs';
import { Attachment } from './models';
import * as path from 'path';

const reporterConfig = loadReporterConfig();

export class TestStep {
  public screenshotAmount: number;

  public name: string;

  public attachments: Attachment[];

  constructor(name: string, screenshotAmount?: number, attachments?: Attachment | Attachment[]) {
    if (screenshotAmount) {
      this.screenshotAmount = screenshotAmount;
    } else {
      this.screenshotAmount = 0;
    }

    if (attachments) {
      if (Array.isArray(attachments))
        this.attachments = attachments;
      else 
        this.attachments.push(attachments);
    } else {
      this.attachments = [];
    }

    if (name) {
      this.name = name;
    } else {
      this.name = reporterConfig.LABEL.DEFAULT_STEP_NAME;
    }
  }

  public registerScreenshot(): void {
    this.screenshotAmount += 1;
  }

  private getDate() {
    let date = new Date(Date.now());
    const offset = new Date(date).getTimezoneOffset();
    date = new Date(date.getTime() + (offset * 60 * 1000));
    return date.toISOString().split('T')[0];
  }

  public registerAttachment(attachment: Attachment): void {
    try {
      const filename = `${attachment.name}_${Date.now().toString()}.${attachment.contentType.toLowerCase()}`;
      const filepath = `${__dirname.split(path.sep).slice(0, -3).join(path.sep) + `${path.sep}allure${path.sep}files`}${path.sep}${this.getDate()}`;
      if (!fs.existsSync(filepath))
        fs.mkdirSync(filepath, { recursive: true });
      fs.writeFileSync(filepath + `${path.sep}${filename}`, attachment.content);
      attachment.path = filepath + `${path.sep}${filename}`;
      this.attachments.push(attachment);
    } catch (e) {
      console.log(e);
    }
  } 

  public mergeOnSameName(testStep: TestStep): boolean {
    if (this.name === testStep.name) {
      if (testStep.screenshotAmount) {
        this.screenshotAmount += testStep.screenshotAmount;
      }
      return true;
    }
    return false;
  }

  // eslint-disable-next-line no-undef
  public addStepToTest(test: TestController): void {
    // Steps can be added to the metadata of the test for persistance.
    const meta: any = this.getMeta(test);
    if (!meta.steps) {
      meta.steps = [];
    }
    meta.steps.push(this);
  }

  // Using the Testcontroller type might cause an error because of a confict with TestCafé's TestController
  private getMeta(testController: any): any {
    let { meta } = testController.testRun.test;
    if (!meta) {
      meta = {};
      testController.testRun.test.meta = meta;
    }
    return meta;
  }
}

/* The TestController loses its parameters when returned as a TestControllerPromise. 
   Therefore the steps cannot be added without a clean TestController.
*/
// eslint-disable-next-line no-undef
export default async function step(name: string, testController: TestController, stepAction: any, attachments?: Attachment[] | Attachment) {
  let stepPromise = stepAction;
  const testStep = new TestStep(name);
  if (attachments) {
    if(Array.isArray(attachments))
      attachments.forEach(attachment => testStep.registerAttachment(attachment));
    else
      testStep.registerAttachment(attachments);
  }
  if (reporterConfig.ENABLE_SCREENSHOTS) {
    stepPromise = stepPromise.takeScreenshot();
    testStep.registerScreenshot();
  }

  testStep.addStepToTest(testController);
  return stepPromise;
}
