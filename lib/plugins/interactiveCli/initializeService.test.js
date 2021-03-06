'use strict';

const { join } = require('path');
const { expect } = require('chai');
const BbPromise = require('bluebird');
const { removeAsync: rmDir, lstatAsync: lstat } = BbPromise.promisifyAll(require('fs-extra'));
const runServerless = require('../../../tests/utils/run-serverless');
const inquirer = require('./inquirer');
const configureInquirerStub = require('./test/configure-inquirer-stub');

const interactiveCliPath = require.resolve('.');
const fixturesPath = join(__dirname, 'test/fixtures');

describe('interactiveCli: initializeService', () => {
  const existingProjectName = 'some-other-service';
  const newProjectName = 'foo-bar';
  const newProjectPath = join(fixturesPath, newProjectName);
  let backupIsTTY;

  before(() => {
    backupIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
  });
  after(() => {
    process.stdin.isTTY = backupIsTTY;
  });

  afterEach(() => {
    if (inquirer.prompt.restore) inquirer.prompt.restore();
  });

  it('Should be ineffective, when at service path', () =>
    runServerless({
      cwd: join(fixturesPath, 'some-other-service'),
      pluginPathsWhitelist: [interactiveCliPath],
      hookNamesWhitelist: ['interactiveCli:initializeService'],
    }));

  it("Should abort if user doesn't want setup", () => {
    configureInquirerStub({
      confirm: { shouldCreateNewProject: false },
    });
    return runServerless({
      cwd: fixturesPath,
      pluginPathsWhitelist: [interactiveCliPath],
      hookNamesWhitelist: ['interactiveCli:initializeService'],
    });
  });

  it("Should abort if user choses 'other' template", () => {
    configureInquirerStub({
      confirm: { shouldCreateNewProject: true },
      list: { projectType: 'other' },
    });
    return runServerless({
      cwd: fixturesPath,
      pluginPathsWhitelist: [interactiveCliPath],
      hookNamesWhitelist: ['interactiveCli:initializeService'],
    });
  });

  describe('Create new project', () => {
    after(() => rmDir(newProjectPath));

    it('Should create project at not existing directory', () => {
      configureInquirerStub({
        confirm: { shouldCreateNewProject: true },
        list: { projectType: 'aws-nodejs' },
        input: { projectName: newProjectName },
      });
      return runServerless({
        cwd: fixturesPath,
        pluginPathsWhitelist: [interactiveCliPath],
        hookNamesWhitelist: ['interactiveCli:initializeService'],
      })
        .then(() => lstat(join(newProjectPath, 'serverless.yml')))
        .then(stats => expect(stats.isFile()).to.be.true);
    });
  });

  it('Should not allow project creation in a directory in which already service is configured', () => {
    configureInquirerStub({
      confirm: { shouldCreateNewProject: true },
      list: { projectType: 'aws-nodejs' },
      input: { projectName: existingProjectName },
    });
    return runServerless({
      cwd: fixturesPath,
      pluginPathsWhitelist: [interactiveCliPath],
      hookNamesWhitelist: ['interactiveCli:initializeService'],
    }).then(
      () => {
        throw new Error('Unexpected');
      },
      error => expect(error.code).to.equal('INVALID_ANSWER')
    );
  });

  it('Should not allow project creation using an invalid project name', () => {
    configureInquirerStub({
      confirm: { shouldCreateNewProject: true },
      list: { projectType: 'aws-nodejs' },
      input: { projectName: 'elo grzegżółka' },
    });
    return runServerless({
      cwd: fixturesPath,
      pluginPathsWhitelist: [interactiveCliPath],
      hookNamesWhitelist: ['interactiveCli:initializeService'],
    }).then(
      () => {
        throw new Error('Unexpected');
      },
      error => expect(error.code).to.equal('INVALID_ANSWER')
    );
  });
});
