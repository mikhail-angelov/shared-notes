//code from https://github.com/kaesetoast/find-in-files

import * as find from "find";
import * as fs from "fs";
import * as Q from "q";

interface SearchPattern {
  term: string | RegExp;
  flags: string;
}
interface Result {
  matches: string[];
  count: number;
  line: string[];
}
interface FileSearchResult {
  filename: string;
  match: RegExpMatchArray|null;
  lines: RegExpMatchArray|null;
}
interface SearchParams {
  regex: RegExp ;
  lineRegEx: RegExp;
  filename: string;
}
function readFile(filename: string){
  return Q.nfcall<string>(fs.readFile, filename, "utf-8");
}

function searchFile(data: SearchParams) {
  return function (content: string): FileSearchResult {
    var match = content.match(data.regex),
      linesMatch = content.match(data.lineRegEx);

    return {
      filename: data.filename,
      match: match,
      lines: linesMatch,
    };
  };
}

function getFileFilter(fileFilter?: string | RegExp) {
  if (typeof fileFilter === "string") {
    fileFilter = new RegExp(fileFilter);
  } else if (typeof fileFilter === "undefined") {
    fileFilter = new RegExp(".");
  }
  return fileFilter;
}

function getRegEx(pattern: string | SearchPattern, regex?: string): RegExp {
  var flags, term: string | RegExp, grabLineRegEx;

  if (typeof pattern === "object" && pattern.flags) {
    term = pattern.term;
    flags = pattern.flags;
  } else {
    term = pattern as string;
    flags = "g";
  }

  grabLineRegEx = "(.*" + term + ".*)";

  if (regex === "line") {
    return new RegExp(grabLineRegEx, flags);
  }

  return new RegExp(term, flags);
}

function getMatchedFiles(pattern: string | SearchPattern, files: string[]) {
  var matchedFiles = [];
  for (var i = files.length - 1; i >= 0; i--) {
    matchedFiles.push(
      readFile(files[i]).then(
        searchFile({
          regex: getRegEx(pattern),
          lineRegEx: getRegEx(pattern, "line"),
          filename: files[i],
        })
      )
    );
  }

  return matchedFiles;
}

function getResults(content: any[]): { [key: string]: Result } {
  var results: any = {};
  for (var i = 0; i < content.length; i++) {
    var fileMatch = content[i].value;
    if (fileMatch && fileMatch.match !== null) {
      results[fileMatch.filename] = {
        matches: fileMatch.match,
        count: fileMatch.match.length,
        line: fileMatch.lines,
      };
    }
  }
  return results;
}

export const findFile = function (
  pattern: string | SearchPattern,
  directory: string,
  fileFilter?: RegExp
) {
  var deferred = Q.defer();
  find
    .file(getFileFilter(fileFilter), directory, function (files: string[]) {
      Q.allSettled(getMatchedFiles(pattern, files))
        .then( (content: any[]) => {
          deferred.resolve(getResults(content));
        })
        .done();
    })
    .error(function (err: any) {
      deferred.reject(err);
    });
  return deferred.promise;
};

export const findFileSync = function (
  pattern: string | SearchPattern,
  directory: string,
  fileFilter?: RegExp
) {
  var deferred = Q.defer();
  var files;
  try {
    files = find.fileSync(getFileFilter(fileFilter), directory);
    Q.allSettled(getMatchedFiles(pattern, files))
      .then(function (content: any) {
        deferred.resolve(getResults(content));
      })
      .done();
  } catch (err) {
    deferred.reject(err);
  }
  return deferred.promise;
};
