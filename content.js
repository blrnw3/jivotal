console.log('JIVOTAL: Waiting to do actions. Please wait.');

// Lazy way to 'ensure' async stuff has loaded
setTimeout(init_stuff, 100);
setTimeout(delayed_stuff, 1000);

var lanes = {
    backlog: {
        id: 234,
        hidden: false,
        order: 1,
        bg_colour: '#F4F4F4'
    },
    current: {
        id: 235,
        hidden: false,
        order: 2,
        bg_colour: '#F3F3D1'
    },
    review: {
        id: 235,
        hidden: false,
        order: 3,
        bg_colour: '#B3D3E1'
    },
    finished: {
        id: 242,
        hidden: false,
        order: 4,
        bg_colour: '#E6FCA2'
    },
    test: {
        id: 239,
        hidden: false,
        default_hidden: true,
        order: 5,
        bg_colour: '#fff'
    },
    done: {
        id: 236,
        hidden: false,
        default_hidden: false,
        order: 6,
        bg_colour: '#DAEBCF'
    }
};

var jira_mappings = {
	'to do': 'backlog',
	'in progress': 'current',
	'in review': 'review',
	'resolved': 'finished',
	'in test': 'test',
	'done': 'done'
};

var config = {
    toggle_delay: 50,
    subtask_toggle_delay: 100
};

function delayed_stuff() {
    console.log('JIVOTAL: Doing actions. Hang on.');

	get_lane_ids();

	//Styles that use lane IDs so should be declared dynamically
    var lane_style = '<style type="text/css">';
    for(var l in lanes) {
        var lane = lanes[l];
        lane_style += '.ghx-column[data-column-id="'+ lane.id +'"] .ghx-issue {background-color: '+ lane.bg_colour +';}';
    }
    lane_style += '</style>';
    $('head').append(lane_style);

    rename_lanes();
    add_column_togglers();
    hide_redundant_lanes();
	add_subtask_togglers();
    
    setInterval(re_jivotalise, 1500); // Until better soln

    console.log('JIVOTAL: Done actions. Enjoy');
}

function init_stuff() {
    // This is unbelievably retarded but it is the only way to be able to debug the CSS in the Inspector.
    // If you put the CSS file in the content_scripts section of manifest, the CSS loads but
    // you can't debug it as it appears as a 'user styleheet'.
    // I don't think I've ever encountered something so stupid from Google.
    var css_url = chrome.extension.getURL('pivotal.css');
    var link_dom = '<link rel="stylesheet" type="text/css" href="'+ css_url +'">';
    $('head').append(link_dom);

    // Surely the biggest hack in history - need to ensure the drag overlays are the correct width
    // based on the columns which have been toggled.
    var hack_style = '<style type="text/css">';
    for(var l in lanes) {
        var lane = lanes[l];
        lane.name = l;
        hack_style += '#ghx-pool[data-lane_'+ lane.name +'_hidden="1"] .ghx-zone-overlay-column:nth-child('+ lane.order +') {width: 0;}';
    }
    hack_style += '</style>';
    $('head').append(hack_style);

    //Styles that need dynamic URLs for images
    var img_style = '<style type="text/css">';
    img_style += '.ghx-issue-fields .ghx-type[title="Bug"] {background: url("'+ chrome.extension.getURL('piv_bug.png') +'")}';
    img_style += '.ghx-issue-fields .ghx-type[title="Chores"] {background: url("'+ chrome.extension.getURL('piv_chore.png') +'")}';
    img_style += '.ghx-issue-fields .ghx-type[title="Story"] {background: url("'+ chrome.extension.getURL('piv_feature.png') +'")}';
    img_style += '</style>';
    $('head').append(img_style);
    
    //And the header, why not.
    $('#logo img').attr('src', chrome.extension.getURL('piv_logo.png'));
}

function re_jivotalise() {
    if($('.sub-task-toggler').length === 0) {
        add_subtask_togglers();
    }
    // Fix lanes
    for(var l in lanes) {
        if(lanes[l].hidden) {
            var lane = lanes[l];
            // Ensure it truly is
            var is_visible = $('[data-column-id="'+ lane.id +'"]').css('display') !== 'none';
            if(is_visible) {
                lane.hidden = false;
                toggle_lane(lane);
            }
        }
    }
    rename_lanes();
}

function get_lane_ids() {
	//Different for each board but defaults have been supplied for SW.
	// I'm going to be nice, however, and try to get IDs for a generic board
	$('#ghx-column-headers .ghx-column').each(function() {
		var jira_name_text = $(this).find('h2').text().toLowerCase();
		if(jira_name_text && jira_mappings[jira_name_text]) {
			lanes[jira_mappings[jira_name_text]].id = $(this).attr('data-id');
		}
	});
}

function add_column_togglers() {
    // Column togglers
    var html = '<div id="column-togglers">';
    for(var l in lanes) {
        var selected = lanes[l].default_hidden ? '' : 'selected';
        html += '<div class="column-toggler '+ selected +'" data-lane-id="'+ l +'">';
        html += l;
        html += '</div>';
    }
    //Also add re-jivotalise btn
    html += '<div id="re-jivotalise">Re-Jivotalise</div>';
    html += '</div>';
    $('#ghx-operations').after(html);

    //Listeners
    $('#column-togglers .column-toggler').click(function() {
       $(this).toggleClass('selected');
       toggle_lane(lanes[$(this).data('lane-id')]);
    });
    $('#re-jivotalise').click(re_jivotalise);
}

function add_subtask_togglers() {
	var toggle_div = '<div class="sub-task-toggler">&#9650; &#9660;</div>';
	$('.ghx-parent-group > .ghx-issue, .ghx-parent-stub').after(toggle_div);
	$('.sub-task-toggler').click(function() {
		$(this).next().toggle(config.subtask_toggle_delay);
	}).click();
}

function rename_lanes() {
    //Pivotal-style renaming of swimlanes
    for(var l in lanes) {
        $('[data-id="'+ lanes[l].id +'"] h2').text(l);
    }
}

function hide_redundant_lanes() {
    for(var l in lanes) {
        if(lanes[l].default_hidden) {
            toggle_lane(lanes[l]);
        }
    }
}

function toggle_lane(lane) {
    var id = lane.id;
    lane.hidden = !lane.hidden;
    $('[data-column-id="'+ id +'"], [data-id="'+ id +'"]').toggle(config.toggle_delay);
    $('#ghx-pool').attr('data-lane_'+ lane.name +'_hidden', lane.hidden ? 1 : -1);
}
