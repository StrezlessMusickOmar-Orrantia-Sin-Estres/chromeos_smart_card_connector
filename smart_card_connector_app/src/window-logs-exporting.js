/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview This script implements logs exporting in the Smart Card
 * Connector App window.
 */

goog.provide('GoogleSmartCard.ConnectorApp.Window.LogsExporting');

goog.require('GoogleSmartCard.Clipboard');
goog.require('GoogleSmartCard.Logging');
goog.require('goog.Timer');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.log');
goog.require('goog.log.Logger');

goog.scope(function() {

const EXPORT_LOGS_EXPORTED_TIMEOUT_MILLISECONDS = 5000;

const GSC = GoogleSmartCard;

const EXPORT_LOGS_ELEMENT_TEXT_ID = 'exportLogs';
const EXPORT_LOGS_ELEMENT_EXPORTING_TEXT_ID = 'exportLogsExporting';
const EXPORT_LOGS_ELEMENT_EXPORTED_TEXT_ID = 'exportLogsExported';

/** @type {!goog.log.Logger} */
const logger = GSC.Logging.getScopedLogger('ConnectorApp.MainWindow');

/** @type {!Element} */
const exportLogsElement =
    /** @type {!Element} */ (goog.dom.getElement('export-logs'));

let isExportLogsAvailable = true;

/**
 * @param {!Event} e
 */
function exportLogsClickListener(e) {
  e.preventDefault();

  if (!isExportLogsAvailable)
    return;

  exportLogsElement.textContent =
      chrome.i18n.getMessage(EXPORT_LOGS_ELEMENT_EXPORTING_TEXT_ID);
  isExportLogsAvailable = false;

  goog.Timer.callOnce(exportLogs);
}

function exportLogs() {
  const logBuffer = GSC.Logging.getLogBuffer();
  // Note: calling methods by indexing properties via strings, since the log
  // buffer comes from the background page, where due to code minification the
  // minified method name might be different.
  const logBufferState = logBuffer['getState'].call(logBuffer);
  const dumpedLogs = logBufferState['getAsText'].call(logBufferState);

  goog.log.fine(
      logger,
      'Prepared a (possibly truncated) dump of ' + logBufferState['logCount'] +
          ' log messages from the log buffer, the dump size is ' +
          dumpedLogs.length + ' characters');
  const copyingSuccess = GSC.Clipboard.copyToClipboard(dumpedLogs);

  if (copyingSuccess) {
    exportLogsElement.textContent =
        chrome.i18n.getMessage(EXPORT_LOGS_ELEMENT_EXPORTED_TEXT_ID);
  } else {
    exportLogsElement.textContent =
        chrome.i18n.getMessage(EXPORT_LOGS_ELEMENT_TEXT_ID);
  }
  goog.Timer.callOnce(
      exportLogsExportedTimeoutPassed,
      EXPORT_LOGS_EXPORTED_TIMEOUT_MILLISECONDS);
}

function exportLogsExportedTimeoutPassed() {
  exportLogsElement.textContent =
      chrome.i18n.getMessage(EXPORT_LOGS_ELEMENT_TEXT_ID);
  isExportLogsAvailable = true;
}

GSC.ConnectorApp.Window.LogsExporting.initialize = function() {
  goog.events.listen(
      exportLogsElement, goog.events.EventType.CLICK, exportLogsClickListener);
};
});  // goog.scope
