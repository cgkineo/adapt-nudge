define([
	'core/js/adapt',
	'./trickleNudgeView'
], function(Adapt, TrickleNudgeView) {

	/*
		This module controls the display of trickle nudges. A trickle nudge appears after a trickle button has been
		visible for a fixed period of time.

		If a trickle nudge is visible, it will be hidden temporarily if a notify or drawer overlay is opened. Once these
		are hidden the page nudge will be shown again.
	*/

	var TrickleNudge = _.extend({

		_overlayCount:0,
		_indicateToUser:false,
		_view:null,
		_steplockedView:null,
		_timerId:null,
		_buttonVisibilityTimerId:null,
		_isButtonVisible:false,
		_nudgeView:null,

		initialize: function() {
			this.listenTo(Adapt, {
				"pageView:preRender": this.onPreRender,
				'trickle:steplock':this.onSteplock,
				'trickle:stepunlock trickle:finished':this.onStepUnlock
			});
		},

		finish:function() {
			var cfg = Adapt.nudge.getConfig(this._view.model);
			// disable on this page from now
			cfg._isTrickleEnabled = false;

			this._hideNudge();
			this._removeTimer();
			this._removeEventListeners();
		},

		_addEventListeners:function() {
			this.listenTo(Adapt, {
				"notify:opened": this.onNotifyOpened,
				"notify:closed": this.onNotifyClosed,
				'nudge:trickleButtonOn':this.onTrickleButtonOn,
				'nudge:trickleButtonOff':this.onTrickleButtonOff,
				'nudge:userGotIt':this.onUserGotIt,
				'drawer:triggerCustomView':this.onDrawerTriggered,
				'drawer:closed':this.onDrawerClosed
			});
		},

		_addTimer:function() {
			var cfg = Adapt.nudge.getConfig(this._view.model);
			var wait = cfg._wait || Adapt.nudge.getConfig()._wait;
			this._timerId = setInterval(_.bind(this.onTimer, this), wait);
		},

		_addButtonVisibilityTimer:function() {
			this._buttonVisibilityTimerId = setInterval(_.bind(this._checkButtonVisibility, this), 100);
		},

		_removeEventListeners:function() {
			this.stopListening(Adapt, {
				'notify:opened':this.onNotifyOpened,
				'notify:closed':this.onNotifyClosed,
				'nudge:trickleButtonOn':this.onTrickleButtonOn,
				'nudge:trickleButtonOff':this.onTrickleButtonOff,
				'nudge:userGotIt':this.onUserGotIt,
				'drawer:triggerCustomView':this.onDrawerTriggered,
				'drawer:closed':this.onDrawerClosed
			});
		},

		_removeTimer:function() {
			clearInterval(this._timerId);
		},

		_removeButtonVisibilityTimer:function() {
			clearInterval(this._buttonVisibilityTimerId);
		},

		_restartTimer:function() {
			this._removeTimer();
			this._addTimer();
		},

		_showNudge: function() {
			this._indicateToUser = true;
			this._nudgeView.setVisible(this._overlayCount == 0);
		},

		_hideNudge: function() {
			this._indicateToUser = false;
			this._nudgeView.setVisible(false);
		},

		_checkButtonVisibility:function() {
			var visible = $('.trickle-button-component .button', this._steplockedView.$el).is(':visible');

			if (visible != this._isButtonVisible) {
				this._isButtonVisible = visible;
				Adapt.trigger(visible ? 'nudge:trickleButtonOn' : 'nudge:trickleButtonOff');
			}
		},

		onPreRender:function(view) {
			var courseConfig = Adapt.nudge.getConfig();
			var pageConfig = Adapt.nudge.getConfig(view.model);
			var showTrickleNudge = courseConfig._isTrickleEnabled && pageConfig._isTrickleEnabled && !courseConfig._hasUserGotTrickle;

			if (!showTrickleNudge) return;

			this._view = view;
			this._overlayCount = 0;
			this._indicateToUser = false;
			this._isButtonVisible = false;

			this.listenToOnce(Adapt, {
				"preRemove": this.onPreRemove,
			});

			this._nudgeView = new TrickleNudgeView();
			$('#wrapper').append(this._nudgeView.$el);

			this._addEventListeners();
		},

		onPreRemove: function() {
			this._nudgeView.remove();
			this._removeTimer();
			this._removeButtonVisibilityTimer();
			this._removeEventListeners();
		},

		onSteplock:function(view) {
			this._steplockedView = view;
			this._addButtonVisibilityTimer();

			if (this._nudgeView) this._nudgeView.setTarget($('.trickle-button-component', this._steplockedView.$el).eq(0));
		},

		onStepUnlock:function(view) {
			this._removeTimer();
			this._removeButtonVisibilityTimer();

			if (this._isButtonVisible) {
				this._isButtonVisible = false;
				Adapt.trigger('nudge:trickleButtonOff');
			}
		},

		onTrickleButtonOn:function() {
			this._restartTimer();
		},

		onTrickleButtonOff:function() {
			this._removeTimer();
			this._hideNudge();
		},

		onNotifyOpened: function() {
			this._overlayCount++;
			this._nudgeView.setVisible(false);
		},

		onNotifyClosed: function() {
			this._overlayCount--;
			if (this._indicateToUser) {
				this._nudgeView.setVisible(this._overlayCount == 0);
			} else {
				this._restartTimer();
			}
		},

		onTimer:function() {
			if (this._isButtonVisible && this._overlayCount == 0) this._showNudge();
		},

		onUserGotIt:function(nudgeView) {
			if (nudgeView != this._nudgeView) return;

			var courseConfig = Adapt.nudge.getConfig();

			courseConfig._hasUserGotTrickle = true;

			Adapt.nudge.saveState();

			this.finish();
		},

		onDrawerTriggered:function(view) {
			this._overlayCount++;
			this._nudgeView.setVisible(false);
		},

		onDrawerClosed:function() {
			this._overlayCount--;
			if (this._indicateToUser) {
				this._nudgeView.setVisible(this._overlayCount == 0);
			} else {
				this._restartTimer();
			}
		}
	}, Backbone.Events);

	Adapt.on("adapt:start", function() {
		if (Adapt.nudge.isEnabled()) {
			TrickleNudge.initialize();
			if (Adapt.nudge.debug) window.tn = TrickleNudge;
		}
	});
});