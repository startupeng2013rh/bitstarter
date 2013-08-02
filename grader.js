var fs = require('fs');
var sys = require('util');
var program = require('commander'); 
var cheerio = require('cheerio');
var rest = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";
var URLFILE_DEFAULT = "downloaded.html";

function assertFileExists(filename) {
    if (!fs.existsSync(filename)) {
        console.log("%s does not exist. Exiting.", filename);
        process.exit(1);
    }
    return filename;
}

function loadChecks(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile)).sort();
}

function checkHtml(html, checks) {
    $ = cheerio.load(html);
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
}

function checkHtmlFile(filename, checks) {
    return checkHtml(fs.readFileSync(filename), checks);
}

function download(url, callback) {
    var resp = rest.get(url);
    resp.on('complete', function(result) {
        if (result instanceof Error) {
            sys.puts('Error: ' + result.message);
            this.retry(5000); // try again after 5 sec
            return;
        }
        callback(null, result);
    });
}

if (require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', assertFileExists, CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to index.html', assertFileExists, HTMLFILE_DEFAULT)
        .option('-u, --url  <html_file>', 'Path to downloaded url', URLFILE_DEFAULT)
        .parse(process.argv); 

    function check(err, html) {
        if (err) {
            console.log('Error getting html: ' + err);
            process.exit(1);
        }
        var checks = loadChecks(program.checks);
        var checkJson = checkHtml(html, checks);
        var outJson = JSON.stringify(checkJson, null, 4);
        console.log(outJson);
    }

    if (program.url) {
        download(program.url, check);
    } else if (program.file) {
        fs.readFile(program.file, check);
    }
} else {
    exports.loadChecks = loadChecks;
    exports.checkHtmlFile = checkHtmlFile;
}
