define([
    'coreJS/adapt'
], function(Adapt) {

    var PageNudgeView = Backbone.View.extend({

        className:"page-nudge",

        events: {
            'click button':'onButtonClicked'
        },

        initialize:function() {
            this.state = {};

            this.render();
            this.setVisible(false);
        },

        render:function() {
            this.$el.html(Handlebars.templates['pageNudge']());
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

        onButtonClicked:function() {
            Adapt.trigger('nudge:userGotIt', this);
        }
    });

    return PageNudgeView;
});