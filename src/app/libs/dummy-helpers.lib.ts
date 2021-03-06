import { format as dateFormat } from 'date-fns';
import * as DummyJSON from 'dummy-json';
import { random } from 'lodash';
import { ensureExists } from 'object-path';
import { parse as qsParse } from 'querystring';
import { Logger } from 'src/app/classes/logger';

const logger = new Logger('[LIB][DUMMY]');

/**
 * Prevents insertion of Dummy-JSON own object (last argument) when no default value is provided:
 *
 * if (typeof defaultValue === 'object') {
 *   defaultValue = '';
 * }
 *
 * /!\ Do not use () => {} for custom helpers in order to keep DummyJSON `this`
 *
 */
export const DummyJSONHelpers = request => {
  return {
    // get json property from body
    body: function(path: string, defaultValue: string) {
      const requestContentType: string = request.header('Content-Type');

      if (typeof defaultValue === 'object') {
        defaultValue = '';
      }

      // try to parse body otherwise return defaultValue
      try {
        let value;

        if (requestContentType.includes('application/x-www-form-urlencoded')) {
          value = qsParse(request.body)[path];
        } else {
          const jsonBody = JSON.parse(request.body);
          value = ensureExists(jsonBody, path);
        }

        if (value !== undefined) {
          return value;
        } else {
          return defaultValue;
        }
      } catch (e) {
        return defaultValue;
      }
    },
    // use params from url /:param1/:param2
    urlParam: function(paramName: string) {
      return request.params[paramName];
    },
    // use params from query string ?param1=xxx&param2=yyy
    queryParam: function(paramName: string, defaultValue: string) {
      if (typeof defaultValue === 'object') {
        defaultValue = '';
      }

      return request.query[paramName] || defaultValue;
    },
    // use content from request header
    header: function(headerName: string, defaultValue: string) {
      if (typeof defaultValue === 'object') {
        defaultValue = '';
      }

      return request.get(headerName) || defaultValue;
    },
    // use value of cookie
    cookie: function(key: string, defaultValue: string) {
      if (typeof defaultValue === 'object') {
        defaultValue = '';
      }

      return request.cookies[key] || defaultValue;
    },
    // use request hostname
    hostname: function() {
      return request.hostname;
    },
    // use request ip
    ip: function() {
      return request.ip;
    },
    // use request method
    method: function() {
      return request.method;
    },
    // return one random item
    oneOf: function(itemList: string[]) {
      return DummyJSON.utils.randomArrayItem(itemList);
    },
    // return some random item as an array (to be used in triple braces) or as a string
    someOf: function(
      itemList: string[],
      min: number,
      max: number,
      asArray = false
    ) {
      const randomItems = itemList
        .sort(() => 0.5 - Math.random())
        .slice(0, random(min, max));

      if (asArray === true) {
        return `["${randomItems.join('","')}"]`;
      }

      return randomItems;
    },
    // create an array
    array: function(...args: any[]) {
      // remove last item (dummy json options argument)
      return args.slice(0, args.length - 1);
    },
    // switch cases
    switch: function(value, options) {
      this.found = false;

      this.switchValue = value;
      const htmlContent = options.fn(this);

      return htmlContent;
    },
    // case helper for switch
    case: function(value, options) {
      // check switch value to simulate break
      if (value === this.switchValue && !this.found) {
        this.found = true;

        return options.fn(this);
      }
    },
    // default helper for switch
    default: function(options) {
      // if there is still a switch value show default content
      if (!this.found) {
        delete this.switchValue;

        return options.fn(this);
      }
    },
    // provide current time with format
    now: function(format) {
      return dateFormat(
        new Date(),
        typeof format === 'string' ? format : "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
        {
          useAdditionalWeekYearTokens: true,
          useAdditionalDayOfYearTokens: true
        }
      );
    }
  };
};

/**
 * Parse a text with DummyJSON
 *
 * @param text
 * @param request
 */
export const DummyJSONParser = (text: string, request: any): string => {
  try {
    return DummyJSON.parse(text, { helpers: DummyJSONHelpers(request) });
  } catch (error) {
    logger.error(`Error while parsing the template: ${error.message}`);
  }
};
