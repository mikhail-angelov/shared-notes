//code from https://github.com/kaesetoast/find-in-files

import * as find from "find";
import * as fs from "fs";
import * as Q from "q";

interface SearchPattern {
  term: string | RegExp;
  flags: string;
}

export interface Result {
  filename: string;
  match: string;
  value: string;
  line: number;
}
interface SearchParams {
  regex: RegExp;
  lineRegEx: RegExp;
  filename: string;
}
function readFile(filename: string) {
  return Q.nfcall<string>(fs.readFile, filename, "utf-8");
}

function searchFile(data: SearchParams) {
  return function (content: string): Result[] {
    const match = content.match(data.regex);
    const linesMatch = content.match(data.lineRegEx);
    if (!match || match.length === 0 || !linesMatch) {
      return [];
    }
    const lines = content.split(/\r?\n|\n|\r/);
    const results = [];
    for (let value of linesMatch) {
      const line = lines.indexOf(value);
      results.push({
        filename: data.filename,
        match: match[0],
        value,
        line,
      });
    }
    return results;
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

function getResults(content: any): Result[] {
  var results: Result[] = [];
  for (let f of content) {
    for (let r of f.value) {
      results.push(r);
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
        .then((content: any[]) => {
          deferred.resolve(getResults(content));
        })
        .done();
    })
    .error(function (err: any) {
      deferred.reject(err);
    });
  return deferred.promise;
};

