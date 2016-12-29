define([
	'coreJS/adapt',
	'./pageNudgeView'
], function(Adapt, PageNudgeView) {

	var PageNudge = _.extend({

		_overlayCount:0,
		_indicateToUser:false,
		_view:null,
		_components:null,
		_mode:'scroll',
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
			cfg._isScrollEnabled = cfg._isPlpEnabled = false;

			Adapt.nudge.saveState();

			this._hideNudge();
			this._removeEventListeners();
		},

		onPreRender:function(view) {
			var courseConfig = Adapt.nudge.getConfig();
			var pageConfig = Adapt.nudge.getConfig(view.model);
			var showScrollNudge = courseConfig._isScrollEnabled && pageConfig._isScrollEnabled && !courseConfig._hasUserGotScroll;
			var showPlpNudge = courseConfig._isPlpEnabled && pageConfig._isPlpEnabled && !courseConfig._hasUserGotPlp && !courseConfig._hasPlpBeenOpened;

			if (!showScrollNudge && !showPlpNudge) return;

			this._view = view;
			this._components = this._view.model.findDescendants('components');
			this._overlayCount = 0;
			this._indicateToUser = false;

			this.listenToOnce(Adapt, {
				"pageView:postRender": this.onPostRender,
				"preRemove": this.onPreRemove,
			});

			this._nudgeView = new PageNudgeView();
			$('#wrapper').append(this._nudgeView.$el);

			this._setMode(showScrollNudge ? 'scroll' : 'plp');
		},

		onPostRender: function(view) {
			this._addEventListeners();
		},

		onPreRemove: function() {
			this._nudgeView.remove();
			this._removeEventListeners();
		},

		_addEventListeners: function() {
			this._addTimer();

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

			this.stopListening(this._components);

			this.stopListening(Adapt, {
				'pageView:postRender':this.onPostRender,
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
			this._nudgeView.setVisible(this._overlayCount == 0);
		},

		_hideNudge: function() {
			this._indicateToUser = false;
			this._nudgeView.setVisible(false);
		},

		_getComponentVisibilityState:function() {
			var onscreen = [], offscreen = [];
			this._components.each(function(c) {
				if (c.get('_isAvailable') && c.get('_isVisible')) {
					var state = $('.'+c.get('_id')).onscreen();
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

		_checkScrollNudge:function() {
			// if page is completed then finish
			if (this._view.model.get('_isComplete')) return this.finish();

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
			// if page is completed then finish
			if (this._view.model.get('_isComplete')) return this.finish();

			// determine if user has interacted with last component
			var lastComponentInteracted = _.last(this._components.where({'_isOptional':false})).get('_isInteractionComplete');

			if (lastComponentInteracted) {
				this._showNudge();
			}
		},

		logComponentVisibilityState:function(state) {
			console.log('onscreen:', _.map(state.onscreen, function(s){return s.component.get('_id')}).join(','));
			console.log('offscreen:', _.map(state.offscreen, function(s){return s.component.get('_id')}).join(','));
		},

		onScroll:function() {
			if (this._mode == 'scroll') {
				this._hideNudge();
				this._restartTimer();
			}
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
			if (this._overlayCount == 0) {
				switch (this._mode) {
					case 'scroll': return this._checkScrollNudge();
					case 'plp': return this._checkPlpNudge();
				}
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

			if (plpModeDisabled || courseConfig._hasUserGotPlp || courseConfig._hasPlpBeenOpened || this._mode == 'plp') {
				this.finish();
			} else {
				this._setMode('plp');
				this._hideNudge();
			}
		},

		onUserGotIt:function(nudgeView) {
			if (nudgeView != this._nudgeView) return;

			var courseConfig = Adapt.nudge.getConfig();
			var pageConfig = Adapt.nudge.getConfig(this._view.model);
			var plpModeDisabled = !courseConfig._isPlpEnabled || !pageConfig._isPlpEnabled;

			if (this._mode == 'scroll') courseConfig._hasUserGotScroll = true;
			else if (this._mode == 'plp') courseConfig._hasUserGotPlp = true;

			Adapt.nudge.saveState();
			
			if (plpModeDisabled || courseConfig._hasUserGotPlp || courseConfig._hasPlpBeenOpened || this._mode == 'plp') {
				this.finish();
			} else {
				this._setMode('plp');
				this._hideNudge();
				this._restartTimer();
			}
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
				Adapt.nudge.getConfig()._hasPlpBeenOpened = true;
				if (this._mode == 'plp') this.finish();
			}
		},

		onDrawerClosed:function() {
			if (Adapt.nudge.debug) console.log('onDrawerClosed');
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
			PageNudge.initialize();
			if (Adapt.nudge.debug) window.pn = PageNudge;
		}
	});
});