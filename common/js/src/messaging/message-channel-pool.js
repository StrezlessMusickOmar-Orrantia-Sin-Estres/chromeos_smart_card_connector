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
 * @fileoverview This file contains the pool that keeps track of all the
 * Closure-style AbstractChannel's used for messaging. A single origin can have
 * multiple channels associated with it.
 */

goog.provide('GoogleSmartCard.MessageChannelPool');

goog.require('GoogleSmartCard.Logging');
goog.require('goog.labs.structs.Multimap');
goog.require('goog.log');
goog.require('goog.log.Logger');
goog.require('goog.messaging.AbstractChannel');

goog.scope(function() {

const GSC = GoogleSmartCard;

/**
 * This class is a pool which keeps track of Closure-style AbstractChannel's.
 * @constructor
 */
GSC.MessageChannelPool = function() {
  /**
   * @type {!goog.log.Logger}
   * @const
   */
  this.logger = GSC.Logging.getScopedLogger('MessageChannelPool');

  /**
   * Multimap from string messaging origin to !goog.messaging.AbstractChannel.
   *
   * TODO(isandrk): the origin may be null (extension talks to itself)
   * @type {!goog.labs.structs.Multimap}
   * @private @const
   */
  this.channels_ = new goog.labs.structs.Multimap;

  /** @type {!Array.<function(!Array.<string>)>} @private @const */
  this.onUpdateListeners_ = [];

  goog.log.fine(this.logger, 'Initialized successfully');
};

const MessageChannelPool = GSC.MessageChannelPool;

/**
 * @param {string} messagingOrigin
 * @return {!Array.<!goog.messaging.AbstractChannel>}
 */
MessageChannelPool.prototype.getChannels = function(messagingOrigin) {
  return /** @type {!Array.<!goog.messaging.AbstractChannel>} */ (
      this.channels_.get(messagingOrigin));
};

/**
 * Returns the messagingOrigin's of all connected channels.
 * @return {!Array.<string>}
 */
MessageChannelPool.prototype.getMessagingOrigins = function() {
  return this.channels_.getKeys();
};

/**
 * @param {string} messagingOrigin
 * @param {!goog.messaging.AbstractChannel} messageChannel
 */
MessageChannelPool.prototype.addChannel = function(
    messagingOrigin, messageChannel) {
  if (this.channels_.containsEntry(messagingOrigin, messageChannel)) {
    GSC.Logging.failWithLogger(
        this.logger, 'Tried to add a channel that was already present');
  }
  goog.log.fine(
      this.logger, 'Added a new channel, origin = ' + messagingOrigin);
  this.channels_.add(messagingOrigin, messageChannel);
  messageChannel.addOnDisposeCallback(
      this.handleChannelDisposed_.bind(this, messagingOrigin, messageChannel));
  this.fireOnUpdateListeners_();
};

/**
 * @param {function(!Array.<string>)} listener
 * @param {!Object=} opt_scope
 */
MessageChannelPool.prototype.addOnUpdateListener = function(
    listener, opt_scope) {
  goog.log.fine(this.logger, 'Added an OnUpdateListener');
  this.onUpdateListeners_.push(
      opt_scope !== undefined ? goog.bind(listener, opt_scope) : listener);
  // Fire it once immediately to update.
  this.fireOnUpdateListeners_();
};

/**
 * @private
 */
MessageChannelPool.prototype.fireOnUpdateListeners_ = function() {
  goog.log.fine(this.logger, 'Firing channel update listeners');
  for (let listener of this.onUpdateListeners_) {
    listener(this.getMessagingOrigins());
  }
};

/**
 * @private
 * @param {string} messagingOrigin
 * @param {!goog.messaging.AbstractChannel} messageChannel
 */
MessageChannelPool.prototype.handleChannelDisposed_ = function(
    messagingOrigin, messageChannel) {
  goog.log.fine(
      this.logger, 'Disposed of channel, origin = ' + messagingOrigin);
  if (!this.channels_.remove(messagingOrigin, messageChannel)) {
    GSC.Logging.failWithLogger(
        this.logger, 'Tried to dispose of non-existing channel');
  }
  this.fireOnUpdateListeners_();
};
});  // goog.scope
