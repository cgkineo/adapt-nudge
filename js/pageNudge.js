define([
	'coreJS/adapt',
	'./pageNudgeView'
], function(Adapt, PageNudgeView) {

	var PageNudge = _.extend({

		_overlayCount:0,
		_indicateToUser:false,
		_view:null,
		_nudgeView:null,
		_debug:true,

		initialize: function() {
			this.listenTo(Adapt, {
				"pageView:preRender": this.onPreRender
			});

			this.onScroll = _.throttle(_.bind(this.onScroll, this), 500);
		},

		finish:function() {
			Adapt.nudge.getConfig(this._view.model)._isEnabled = false;
			this._hideNudge();
			this._removeEventListeners();
		},

		onPreRender:function(view) {
			var config = Adapt.nudge.getConfig(view.model);

			this._view = view;
			this._components = this._view.model.findDescendants('components');

			if (!config._isEnabled) return;

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

			this.listenTo(Adapt, {
				"notify:opened tutor:opened": this.onOverlay,
				"notify:closed tutor:closed": this.onOverlayClosed,
				'nudge:userGotIt':this.onUserGotIt
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
				'notify:opened tutor:opened':this.onOverlay,
				'notify:closed tutor:closed':this.onOverlayClosed,
				'nudge:userGotIt':this.onUserGotIt
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

		logComponentVisibilityState:function(state) {
			console.log('onscreen:', _.map(state.onscreen, function(s){return s.component.get('_id')}).join(','));
			console.log('offscreen:', _.map(state.offscreen, function(s){return s.component.get('_id')}).join(','));
		},

		onScroll:function() {
			this._restartTimer();
			this._hideNudge();
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

		onComponentComplete:function() {
			this._restartTimer();
		},

		onUserGotIt:function() {
			this.finish();
		}
	}, Backbone.Events);

	Adapt.on("adapt:start", function() {
		if (Adapt.nudge.isEnabled()) {
			PageNudge.initialize();
			window.pn = PageNudge;
		}
	});
});