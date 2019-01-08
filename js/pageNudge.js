define([
	'core/js/adapt',
	'./pageNudgeView',
	'./enums/nudgeStateEnum'
], function(Adapt, PageNudgeView, NUDGE_STATE) {

	/*
		This module controls the display of three different page nudges; scroll, plp and completion. These nudges are
		displayed in this order, but they are not mandatory; one or more of them can be disabled. There is one
		exception to the rule of order and that is as soon as the page is completed the completion nudge will become
		active.

		If a page nudge is visible, it will be hidden temporarily if a trickle nudge appears or if a notify or drawer
		overlay is opened. Once these are hidden the page nudge will be shown again.
	*/

	var PageNudge = _.extend({

		_overlayCount:0,
		_indicateToUser:false,
		_finished:true,
		_view:null,
		_components:null,
		_mode:NUDGE_STATE.SCROLL,
		_nudgeView:null,

		initialize: function() {
			this.listenTo(Adapt, {
				"pageView:preRender": this.onPreRender
			});

			this.onScroll = _.throttle(_.bind(this.onScroll, this), 500);
		},

		finish:function() {
			var cfg = Adapt.nudge.getConfig(this._view.model);
			// disable on this page from now
			cfg._isScrollEnabled = cfg._isPlpEnabled = cfg._isPageCompletionEnabled = false;

			this._finished = true;

			Adapt.nudge.saveState();

			this._hideNudge();
			this._removeEventListeners();
		},

		onPreRender:function(view) {
			var courseConfig = Adapt.nudge.getConfig();
			var pageConfig = Adapt.nudge.getConfig(view.model);
			var showScrollNudge = courseConfig._isScrollEnabled && pageConfig._isScrollEnabled && !courseConfig._hasUserGotScroll;
			var showPlpNudge = courseConfig._isPlpEnabled && pageConfig._isPlpEnabled && !courseConfig._hasUserGotPlp && !courseConfig._hasPlpBeenOpened;
			var nudgePlpBeforeScroll = courseConfig._nudgePlpBeforeScroll;
			var showPageCompletionNudge = courseConfig._isPageCompletionEnabled && pageConfig._isPageCompletionEnabled && !courseConfig._hasUserGotPageCompletion && !courseConfig._hasBackButtonBeenClicked;

			if (!showScrollNudge && !showPlpNudge && !showPageCompletionNudge) return;

			this._view = view;
			this._components = this._view.model.findDescendants('components');
			this._overlayCount = 0;
			this._indicateToUser = false;
			this._finished = false;

			this.listenToOnce(Adapt, {
				"pageView:ready": this.onReady,
				"preRemove": this.onPreRemove
			});

			this._nudgeView = new PageNudgeView();
			this._nudgeView.setCompletionTargetSelector(pageConfig._completionNudgeTarget);

			$('#wrapper').append(this._nudgeView.$el);

			if (showPlpNudge && nudgePlpBeforeScroll) this._setMode(NUDGE_STATE.PLP);
			else if (showScrollNudge) this._setMode(NUDGE_STATE.SCROLL);
			else if (showPlpNudge) this._setMode(NUDGE_STATE.PLP);
			else if (showPageCompletionNudge) this._setMode(NUDGE_STATE.COMPLETE);
		},

		onReady: function(view) {
			this._addEventListeners();
		},

		onPreRemove: function() {
			this._nudgeView.remove();
			this._removeEventListeners();
		},

		_addEventListeners: function() {
			this._addTimer();

			this.listenTo(this._view.model, 'change:_isComplete', this.onPageComplete);
			this.listenTo(this._components, 'change:_isComplete', this.onComponentComplete);
			this.listenTo(_.last(this._components.where({'_isOptional':false})), 'change:_isInteractionComplete', this.onLastComponentInteraction);

			this.listenTo(Adapt, {
				"notify:opened": this.onNotifyOpened,
				"notify:closed": this.onNotifyClosed,
				'nudge:userGotIt':this.onUserGotIt,
				'nudge:trickleButtonOn':this.onTrickleButtonOn,
				'nudge:trickleButtonOff':this.onTrickleButtonOff,
				'drawer:triggerCustomView':this.onDrawerTriggered,
				'drawer:closed':this.onDrawerClosed
			});

			$(window).on('scroll', this.onScroll);
		},

		_addTimer:function() {
			var cfg = Adapt.nudge.getConfig(this._view.model);
			var wait = cfg._wait || Adapt.nudge.getConfig()._wait;
			this._timerId = setInterval(_.bind(this.onTimer, this), wait);
		},

		_removeEventListeners: function() {
			this._removeTimer();

			this.stopListening(this._view.model, 'change:_isComplete', this.onPageComplete);
			this.stopListening(this._components);

			this.stopListening(Adapt, {
				'pageView:ready':this.onReady,
				'notify:opened':this.onNotifyOpened,
				'notify:closed':this.onNotifyClosed,
				'nudge:userGotIt':this.onUserGotIt,
				'nudge:trickleButtonOn':this.onTrickleButtonOn,
				'nudge:trickleButtonOff':this.onTrickleButtonOff,
				'drawer:triggerCustomView':this.onDrawerTriggered,
				'drawer:closed':this.onDrawerClosed
			});

			$(window).off('scroll', this.onScroll);
		},

		_removeTimer:function() {
			clearInterval(this._timerId);
		},

		_restartTimer:function() {
			this._removeTimer();
			this._addTimer();
		},

		_showNudge: function() {
			this._indicateToUser = true;
			this._nudgeView.setVisible(!this._isOverlayVisible());
		},

		_hideNudge: function() {
			this._indicateToUser = false;
			this._nudgeView.setVisible(false);
		},

		_getComponentVisibilityState:function() {
			var onscreen = [], offscreen = [];
			this._components.each(function(c) {
				if (c.get('_isAvailable') && c.get('_isVisible')) {
					var state = $('[data-adapt-id="'+c.get('_id')+'"]').onscreen();
					if (state.onscreen) {
						onscreen.push({'component':c, 'state':state});
					} else {
						offscreen.push({'component':c, 'state':state});
					}
				}
			});
			var ret = {'onscreen':onscreen, 'offscreen':offscreen};

			return ret;
		},

		_setMode:function(mode) {
			this._mode = mode;
			this._nudgeView.setMode(mode);
		},

		_changeMode:function() {
			var courseConfig = Adapt.nudge.getConfig();
			var pageConfig = Adapt.nudge.getConfig(this._view.model);
			var scrollModeDisabled = !courseConfig._isScrollEnabled || !pageConfig._isScrollEnabled;
			var plpModeDisabled = !courseConfig._isPlpEnabled || !pageConfig._isPlpEnabled;
			var nudgePlpBeforeScroll = courseConfig._nudgePlpBeforeScroll;
			var pageCompletionDisabled = !courseConfig._isPageCompletionEnabled || !pageConfig._isPageCompletionEnabled;

			switch (this._mode) {
				case NUDGE_STATE.COMPLETE:
					if (Adapt.nudge.debug) console.log('_changeMode: mode=complete, calling finish');
					this.finish();
					break;
				case NUDGE_STATE.PLP:
					if (nudgePlpBeforeScroll && !scrollModeDisabled && !courseConfig._hasUserGotScroll) {
						this._setMode(NUDGE_STATE.SCROLL);
						this._hideNudge();
						this._restartTimer();
					}
					else if (!pageCompletionDisabled && !courseConfig._hasUserGotPageCompletion && !courseConfig._hasBackButtonBeenClicked) {
						this._setMode(NUDGE_STATE.COMPLETE);
						this._hideNudge();
						this._restartTimer();
					} else {
						if (Adapt.nudge.debug) console.log('_changeMode: mode=plp, calling finish');
						this.finish();
					}
					break;
				case NUDGE_STATE.SCROLL:
					if (!nudgePlpBeforeScroll && !plpModeDisabled && !courseConfig._hasUserGotPlp && !courseConfig._hasPlpBeenOpened) {
						this._setMode(NUDGE_STATE.PLP);
						this._hideNudge();
						this._restartTimer();
					} else if (!pageCompletionDisabled && !courseConfig._hasUserGotPageCompletion && !courseConfig._hasBackButtonBeenClicked) {
						this._setMode(NUDGE_STATE.COMPLETE);
						this._hideNudge();
						this._restartTimer();
					} else {
						if (Adapt.nudge.debug) console.log('_changeMode: mode=scroll, calling finish');
						this.finish();
					}
					break;
			}
		},

		_checkScrollNudge:function() {
			// get visibility state of all page components
			var state = this._getComponentVisibilityState();
			// determine whether it is appropriate to encourage user to scroll
			var onscreenComponentsComplete = _.every(state.onscreen, function(s) {
				var cfg = Adapt.nudge.getConfig(s.component);
				var vt = cfg._visibilityThreshold;
				if (isNaN(vt)) vt = Adapt.nudge.getConfig()._visibilityThreshold;
				return cfg._isNonInteractive || s.component.get('_isComplete') || s.state.percentInview < vt;
			});

			// if everything visible is complete then nudge
			if (onscreenComponentsComplete) {
				this._showNudge();
			}
		},

		_checkPlpNudge:function() {
			// determine if user has interacted with last component
			var lastComponentInteracted = _.last(this._components.where({'_isOptional':false})).get('_isInteractionComplete');
			var courseConfig = Adapt.nudge.getConfig();

			if (lastComponentInteracted || courseConfig._nudgePlpBeforeScroll) {
				this._showNudge();
			}
		},

		_checkPageCompletionNudge:function() {
			if (this._view.model.get('_isComplete')) {
				this._showNudge();
			}
		},

		_isOverlayVisible:function() {
			return this._overlayCount > 0;
		},

		logComponentVisibilityState:function(state) {
			console.log('onscreen:', _.map(state.onscreen, function(s){return s.component.get('_id');}).join(','));
			console.log('offscreen:', _.map(state.offscreen, function(s){return s.component.get('_id');}).join(','));
		},

		onScroll:function() {
			// perform this check to prevent last throttled call executing erroneously
			if (this._finished) return;

			var courseConfig = Adapt.nudge.getConfig();
			var pageConfig = Adapt.nudge.getConfig(this._view.model);

			if (this._mode == NUDGE_STATE.SCROLL) {
				if (this._nudgeView.state._isVisible && courseConfig._showScrollNudgeOnlyOnce) {
					// disable on all pages now
					courseConfig._hasUserGotScroll = true;
					this._changeMode();
					Adapt.nudge.saveState();
				} else if (this._nudgeView.state._isVisible && pageConfig._showScrollNudgeOnlyOnce) {
					// disable on this page from now
					pageConfig._isScrollEnabled = false;
					this._changeMode();
					Adapt.nudge.saveState();
				} else {
					this._hideNudge();
					this._restartTimer();
				}
			}
		},

		onNotifyOpened: function() {
			this._overlayCount++;
			this._nudgeView.setVisible(false);
		},

		onNotifyClosed: function() {
			this._overlayCount--;
			if (this._indicateToUser) {
				this._nudgeView.setVisible(!this._isOverlayVisible());
			} else {
				this._restartTimer();
			}
		},

		onTimer:function() {
			if (!this._isOverlayVisible()) {
				switch (this._mode) {
					case NUDGE_STATE.SCROLL: return this._checkScrollNudge();
					case NUDGE_STATE.PLP: return this._checkPlpNudge();
					case NUDGE_STATE.COMPLETE: return this._checkPageCompletionNudge();
				}
			}
		},

		onPageComplete:function() {
			var courseConfig = Adapt.nudge.getConfig();
			var pageConfig = Adapt.nudge.getConfig(this._view.model);
			var pageCompletionDisabled = !courseConfig._isPageCompletionEnabled || !pageConfig._isPageCompletionEnabled;

			if (pageCompletionDisabled || courseConfig._hasUserGotPageCompletion || courseConfig._hasBackButtonBeenClicked) {
				if (Adapt.nudge.debug) console.log('onPageComplete: calling finish');
				this.finish();
			} else {
				this._setMode(NUDGE_STATE.COMPLETE);
				this._hideNudge();
			}
		},

		onComponentComplete:function() {
			this._restartTimer();
		},

		onLastComponentInteraction:function() {
			var courseConfig = Adapt.nudge.getConfig();
			var pageConfig = Adapt.nudge.getConfig(this._view.model);
			var plpModeDisabled = !courseConfig._isPlpEnabled || !pageConfig._isPlpEnabled;

			// by interacting with the last component the user has demonstrated awareness of page length
			pageConfig._isScrollEnabled = false;

			Adapt.nudge.saveState();

			if (this._mode == NUDGE_STATE.SCROLL) this._changeMode();
		},

		onUserGotIt:function(nudgeView) {
			if (nudgeView != this._nudgeView) return;

			var courseConfig = Adapt.nudge.getConfig();
			var pageConfig = Adapt.nudge.getConfig(this._view.model);
			var plpModeDisabled = !courseConfig._isPlpEnabled || !pageConfig._isPlpEnabled;
			var pageCompletionDisabled = !courseConfig._isPageCompletionEnabled || !pageConfig._isPageCompletionEnabled;

			if (this._mode == NUDGE_STATE.SCROLL) courseConfig._hasUserGotScroll = true;
			else if (this._mode == NUDGE_STATE.PLP) courseConfig._hasUserGotPlp = true;
			else if (this._mode == NUDGE_STATE.COMPLETE) courseConfig._hasUserGotPageCompletion = true;

			Adapt.nudge.saveState();

			this._changeMode();
		},

		onTrickleButtonOn:function() {
			if (Adapt.nudge.debug) console.log('onTrickleButtonOn');
			this._overlayCount++;
			this._nudgeView.setVisible(false);
		},

		onTrickleButtonOff:function() {
			if (Adapt.nudge.debug) console.log('onTrickleButtonOff');
			this._overlayCount--;
			this._restartTimer();
		},

		onDrawerTriggered:function(view) {
			if (Adapt.nudge.debug) console.log('onDrawerTriggered');
			this._overlayCount++;
			this._nudgeView.setVisible(false);

			if (view && $(view).hasClass('page-level-progress')) {
				if (!Adapt.nudge.getConfig()._hasPlpBeenOpened) {
					Adapt.nudge.getConfig()._hasPlpBeenOpened = true;
					Adapt.nudge.saveState();
				}
				if (this._mode == NUDGE_STATE.PLP) this._changeMode();
			}
		},

		onDrawerClosed:function() {
			if (Adapt.nudge.debug) console.log('onDrawerClosed');
			this._overlayCount--;
			if (this._indicateToUser) {
				this._nudgeView.setVisible(!this._isOverlayVisible());
			} else {
				this._restartTimer();
			}
		}
	}, Backbone.Events);

	Adapt.on("adapt:start", function() {
		if (Adapt.nudge.isEnabled()) {
			PageNudge.initialize();
			if (Adapt.nudge.debug) window.pn = PageNudge;
		}
	});
});
