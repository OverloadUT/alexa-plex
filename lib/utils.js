var dice = require('clj-fuzzy').metrics.dice;

module.exports.findBestMatch = function(phrase, items, mapfunc) {
    var MINIMUM = 0.2;

    var bestmatch = {index: -1, score: -1};
    for(i=0; i<items.length; i++) {
        var item = items[i];
        if (mapfunc) {
            item = mapfunc(items[i]);
        }

        var score = dice(phrase, item);

        //console.log(score + ': ' + item);

        if(score >= MINIMUM && score > bestmatch.score) {
            bestmatch.index = i;
            bestmatch.score = score;
        }
    }

    if(bestmatch.index === -1) {
        return false;
    } else {
        return {
            bestMatch: items[bestmatch.index],
            confidence: bestmatch.score
        };
    }
};

module.exports.buildNaturalLangList = function(items, finalWord, hyphenize) {
    var output = '';
    for(var i = 0; i<items.length; i++) {
        var item = items[i];
        if(hyphenize) {
            item = item.replace(/ /g, '-');
        }

        if(i === 0) {
            output += item;
        } else if (i < items.length-1) {
            output += ', ' + item;
        } else {
            if(items.length > 2) {
                output += ',';
            }
            output += ' ' + finalWord + ' ' + item;
        }
    }

    return output;
};

module.exports.randomInt = function(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
};