/* eslint-disable class-methods-use-this,array-callback-return */
import { AllureTest, LinkType, Severity } from 'allure-js-commons';
import { LabelName, Priority } from './models'; 
import { TestStep } from '../testcafe/step';
import { loadReporterConfig } from '../utils/config';

const reporterConfig = loadReporterConfig();

export default class Metadata {
  severity: string;

  priority: Priority;

  description: string = "";

  issue: string;

  parent_suite: string;

  suite: string;

  sub_suite: string;

  epic: string;

  story: string;

  feature: string;

  flaky: boolean = false;

  steps: TestStep[];

  user_story: string;

  test_case: string;

  otherMeta: Map<string, string>;

  links: string[];

  constructor(meta?: any, test?: boolean) {
    this.otherMeta = new Map();
    this.links = [];
    if (meta) {
      const { severity, priority, description, issue, suite, epic, story, feature, flaky, steps, user_story, test_case, ...otherMeta } = meta;
      
      //if (this.isValidEnumValue(severity, Severity)) {
      if (this.isValidEnumValue(severity, Severity)) {
        this.severity = severity;
      }

      if (this.isValidEnumValue(priority, Priority)) {
        this.priority = priority;
      }
      if (this.isString(description)) {
        this.description = description;
      }
      if (this.isString(issue)) {
        this.issue = issue;
      }
      if (this.isString(suite)) {
        if (test) {
          this.sub_suite = suite;
        } else {
          this.parent_suite = suite;
        }
      }
      if (this.isString(epic)) {
        this.epic = epic;
      }
      if (this.isString(story)) {
        this.story = story;
      }
      if (this.isString(feature)) {
        this.feature = feature;
      }
      if (this.isBoolean(flaky)) {
        this.flaky = flaky;
      }
      if (steps) {
        this.steps = steps;
      }
      if(this.isString(user_story)) {
        this.user_story = user_story;
      }
      if(this.isString(test_case)) {
        this.test_case = test_case;
      }
      Object.keys(otherMeta).forEach((key) => {
        if (this.isString(otherMeta[key])) {
          this.otherMeta.set(key, otherMeta[key]);
        }
      });
    }
  }

  addMetadataToTest(test: AllureTest, groupMetadata: Metadata) {
    if (!(groupMetadata instanceof Metadata)) {
      throw new Error('groupMetadata is not a valid Metadata object');
    }

    // Once metadata has been set it cannot be overritten,
    // therefore priority metadata has to be loaded added first
    // The results will list both entries if both added but allure will only take the first.
    this.mergeMetadata(groupMetadata);

    // Labels only accept specific keys/names as valid, it will ignore all other labels
    // Other variabels have to be added as parameters or links.
    if (this.severity) {
      test.addLabel(LabelName.SEVERITY, this.severity);
    } else {
      // If no priority is given, set the default priority
      test.addLabel(LabelName.SEVERITY, reporterConfig.META.SEVERITY);
    }

    // Only the first priority value is loaded.
    if (this.priority) {
      test.addLabel(LabelName.PRIORITY, this.priority);
    } else {
      // If no priority is given, set the default priority
      test.addLabel(LabelName.PRIORITY, reporterConfig.META.PRIORITY);
    }

    // Tests can be added to multiple suites at the same time.
    // Suites support 3 different suite levels: Parent, Suite, Sub
    // A test can have multiple of the same level suites but this will duplicate the test in the report
    // If a test has 2 parents and 2 suites the result will be that the test is duplicated 4 times for each combination.
    // Therefore it is advisable to only use suites to categorise them in single fixtures and not for custom configurations.
    if (this.parent_suite) {
      test.addLabel(LabelName.PARENT_SUITE, this.parent_suite);
    }
    if (this.suite) {
      test.addLabel(LabelName.SUITE, this.suite);
    }
    if (this.sub_suite) {
      test.addLabel(LabelName.SUB_SUITE, this.sub_suite);
    }

    // BDD style notation, containing Epics, Features, and Stories can be added to the tests.
    // These labels work the same way as the suites containing 3 levels. These are in order: Epic -> Feature -> Story
    if (this.epic) {
      let _epicID = this.epic.match(/\[(.*?)\]/);
      test.addLabel(LabelName.EPIC, this.epic);
      if(_epicID)
        this.addLink(`${reporterConfig.META.JIRA_URL}${_epicID[1]}`, `${reporterConfig.LABEL.EPIC}: ${_epicID[1]}`, "bolt");
    }
    if (this.feature) {
      test.addLabel(LabelName.FEATURE, this.feature);
    }
    if (this.story) {
      let _usID = this.story.match(/\[(.*?)\]/);
      test.addLabel(LabelName.STORY, this.story);
      if(_usID)
        this.addLink(`${reporterConfig.META.JIRA_URL}${_usID[1]}`, `${reporterConfig.LABEL.STORY}: ${_usID[1]}`, "bookmark");
    }

    if(!this.story && this.user_story) {
      this.addLink(`${reporterConfig.META.JIRA_URL}${this.user_story}`, `${reporterConfig.LABEL.STORY}: ${this.user_story}`, "bookmark");
    }

    if (this.issue) {
      (this.issue.split(",")).forEach((issue) => {
        this.addLink(
          `${reporterConfig.META.JIRA_URL}${issue}`,
          `${reporterConfig.LABEL.ISSUE}: ${issue}`,
          "check-square",
        )
      })
      /*test.addLink(
        `${reporterConfig.META.JIRA_URL}${this.issue}`,
        `${reporterConfig.LABEL.ISSUE}: ${this.issue}`,
        LinkType.TMS,
      );*/
    } 
    
    if(!this.issue && this.test_case) {
      this.addLink(
        `${reporterConfig.META.JIRA_URL}${this.test_case}`,
        `${reporterConfig.LABEL.ISSUE}: ${this.test_case}`,
        "check-square",
      ) 
    }

    
    // Flaky is a boolean, only add to test if flaky is true.
    if (this.flaky) {
      // TODO: Add flaky correctly to allure instead of as a parameter
      // However currenly allure-js-commons does not seem to support flaky tests.
      test.addParameter(reporterConfig.LABEL.FLAKY, this.flaky.toString());
    }

    if (this.description) {
      /* eslint-disable-next-line no-param-reassign */
      let newDescription = this.description ? this.description.split("\n").join("<br/>")+ "<br/>" : this.description;
      newDescription += this.priority ? "<br/><strong>"+ LabelName.PRIORITY +"</strong>: " + ((this.priority) ? this.priority : reporterConfig.META.PRIORITY) : "";
      newDescription += "<h3 class='pane__section-title'>Links</h3>";
      this.links.forEach(link => {
        newDescription += link + "<br/>";
      })
      test.description = newDescription;
    }


    Array.from(this.otherMeta.entries()).map((entry) => {
      test.addParameter(entry[0], entry[1]);
    });
  }

  private mergeMetadata(metadata: Metadata) {
    // Local metadata takes preference to merged metadata
    if (!this.severity && metadata.severity) {
      this.severity = metadata.severity;
    }    
    if (!this.priority && metadata.priority) {
      this.priority = metadata.priority;
    }
    if (!this.description && metadata.description) {
      this.description = metadata.description;
    }
    if (!this.issue && metadata.issue) {
      this.issue = metadata.issue;
    }
    // Parent_Suite and Suite are used from the merged metadata but Sub_Suite is not.
    if (!this.parent_suite && metadata.parent_suite) {
      this.parent_suite = metadata.parent_suite;
    }
    if (!this.suite && metadata.suite) {
      this.suite = metadata.suite;
    }
    if (!this.epic && metadata.epic) {
      this.epic = metadata.epic;
    }
    if (!this.story && metadata.story) {
      this.story = metadata.story;
    }
    if (!this.feature && metadata.feature) {
      this.feature = metadata.feature;
    }
    if (!this.user_story && metadata.user_story) {
      this.user_story = metadata.user_story;
    }
    if (!this.test_case && metadata.test_case) {
      this.test_case = metadata.test_case;
    }
    if (metadata.flaky) {
      this.flaky = metadata.flaky;
    }
    if (metadata.otherMeta.size > 0) {
      Array.from(metadata.otherMeta.entries()).map((entry) => {
        if (!this.otherMeta.has(entry[0])) {
          this.otherMeta.set(entry[0], entry[1]);
        }
      });
    }
  }

  public setFlaky() {
    this.flaky = true;
  }

  public addDescription(text: string) {
    this.description += text
  }

  public addLink(url: string, text: string, icon: string) {
    this.links.push(`<a class='link' href='${url}' target='_blank'><i class='fa fa-${icon}'></i>${' ' + text}</a>`);
  }

  public addOtherMeta(key: string, value: string) {
    this.otherMeta.set(key, value);
  }

  public getSteps(): TestStep[] | null {
    if (this.steps) {
      return this.steps;
    }
    return null;
  }

  private isValidEnumValue(value: string, validEnum: { [s: string]: string }): boolean {
    if (!value) {
      return false;
    }
    return value.toUpperCase() in validEnum;
  }

  private isString(value: any): boolean {
    if (!value) {
      return false;
    }
    return typeof value === 'string';
  }

  private isBoolean(value: any): boolean {
    return typeof value === 'boolean';
  }
}
