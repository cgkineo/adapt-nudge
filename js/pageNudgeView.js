define([
    'coreJS/adapt'
], function(Adapt) {

    var PageNudgeView = Backbone.View.extend({

        className:"page-nudge",

        events: {
            'click button':'onButtonClicked'
        },

        initialize:function() {
            this.state = {
                '_mode':'scroll'
            };

            this.render();
            this.setVisible(false);
        },

        render:function() {
            this.$el.html(Handlebars.templates['pageNudge']());
            this.$el.attr('data-mode', this.state._mode);
            return this;
        },

        remove:function() {
            this.$el.remove();
        },

        setVisible: function(visible) {
            if (this.state._isVisible == visible) return;
            this.state._isVisible = visible;
            this.$el.toggleClass('display-none', !visible)
        },

        setMode:function(mode) {
            this.state._mode = mode;
            this.$el.attr('data-mode', this.state._mode);
        },

        onButtonClicked:function() {
            Adapt.trigger('nudge:userGotIt', this);
        }
    });

    return PageNudgeView;
});