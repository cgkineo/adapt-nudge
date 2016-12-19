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
		_debug:true,

		initialize: function() {
			this.listenTo(Adapt, {
				"pageView:preRender": this.onPreRender
			});

			this.onScroll = _.throttle(_.bind(this.onScroll, this), 500);
		},

		finish:function(disableOnOtherPages) {
			// disable on this page from now
			Adapt.nudge.getConfig(this._view.model)._isEnabled = false;
			if (disableOnOtherPages) {
				// disable on all other pages unless explicitly enabled
				Adapt.contentObjects.each(function(contentObject) {
					var cfg = Adapt.nudge.getConfig(contentObject);
					if (cfg._isEnabled !== true) cfg._isEnabled = false;
				});
			}
			this._hideNudge();
			this._removeEventListeners();
		},

		onPreRender:function(view) {
			var config = Adapt.nudge.getConfig(view.model);

			this._view = view;
			this._components = this._view.model.findDescendants('components');
			this._mode = 'scroll';

			if (config._isEnabled === false) return;

			this.listenToOnce(Adapt, {
				"pageView:postRender": this.onPostRender,
				"preRemove": this.onPreRemove,
			});
		},

		onPostRender: function(view) {
			this._nudgeView = new PageNudgeView();

			$('#wrapper').append(this._nudgeView.$el);

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
				"notify:opened tutor:opened": this.onOverlay,
				"notify:closed tutor:closed": this.onOverlayClosed,
				'nudge:userGotIt':this.onUserGotIt
			});

			this.listenToOnce(Adapt, 'drawer:triggerCustomView', this.onDrawerTriggered);

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
				'notify:opened tutor:opened':this.onOverlay,
				'notify:closed tutor:closed':this.onOverlayClosed,
				'nudge:userGotIt':this.onUserGotIt,
				'drawer:triggerCustomView': this.onDrawerTriggered
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
			if (this._debug) this.logComponentVisibilityState(ret);
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

		onOverlay: function() {
			this._overlayCount++;
			this._nudgeView.setVisible(false);
		},

		onOverlayClosed: function() {
			this._overlayCount--;
			this._nudgeView.setVisible(this._indicateToUser);
		},

		onTimer:function() {
			switch (this._mode) {
				case 'scroll': return this._checkScrollNudge();
				case 'plp': return this._checkPlpNudge();
			}
		},

		onComponentComplete:function() {
			this._restartTimer();
		},

		onLastComponentInteraction:function() {
			this._setMode('plp');
		},

		onUserGotIt:function() {
			var globalPlpCfg = Adapt.nudge.getConfig()._pageLevelProgress;
			var pagePlpCfg = Adapt.nudge.getConfig(this._view.model)._pageLevelProgress;
			var plpModeDisabled = !globalPlpCfg._isEnabled || (pagePlpCfg && pagePlpCfg._isEnabled === false);
			
			if (plpModeDisabled || globalPlpCfg._hasBeenOpened || this._mode == 'plp') {
				this.finish(true);
			} else {
				this._setMode('plp');
				this._hideNudge();
				this._restartTimer();
			}
		},

		onDrawerTriggered:function(view) {
			if (view && $(view).hasClass('page-level-progress')) {
				Adapt.nudge.getConfig()._pageLevelProgress._hasBeenOpened = true;
				if (this._mode == 'plp') this.finish(true);
			}
		}
	}, Backbone.Events);

	Adapt.on("adapt:start", function() {
		if (Adapt.nudge.isEnabled()) {
			PageNudge.initialize();
			window.pn = PageNudge;
		}
	});
});