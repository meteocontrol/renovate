import { platform } from '../../../platform';

const handlebars = require('handlebars');

const versioning = require('../../../versioning');

const { getPrConfigDescription } = require('./config-description');
const { getPrBanner } = require('./banner');
const { getPrFooter } = require('./footer');
const { getPrUpdatesTable } = require('./updates-table');
const { getPrNotes, getPrExtraNotes } = require('./notes');
const { getChangelogs } = require('./changelogs');
const { getControls } = require('./controls');

handlebars.registerHelper('encodeURIComponent', encodeURIComponent);

export { getPrBody };

function massageUpdateMetadata(config) {
  config.upgrades.forEach(upgrade => {
    /* eslint-disable no-param-reassign */
    const { homepage, sourceUrl, sourceDirectory, changelogUrl } = upgrade;
    let depNameLinked = upgrade.depName;
    const primaryLink = homepage || sourceUrl;
    if (primaryLink) {
      depNameLinked = `[${depNameLinked}](${primaryLink})`;
    }
    const otherLinks = [];
    if (homepage && sourceUrl) {
      otherLinks.push(`[source](${sourceUrl})`);
    }
    if (changelogUrl) {
      otherLinks.push(`[changelog](${changelogUrl})`);
    }
    if (otherLinks.length) {
      depNameLinked += ` (${otherLinks.join(', ')})`;
    }
    upgrade.depNameLinked = depNameLinked;
    const references = [];
    if (homepage) {
      references.push(`[homepage](${homepage})`);
    }
    if (sourceUrl) {
      let fullUrl = sourceUrl;
      if (sourceDirectory) {
        fullUrl =
          sourceUrl.replace(/\/?$/, '/') +
          'tree/HEAD/' +
          sourceDirectory.replace('^/?/', '');
      }
      references.push(`[source](${fullUrl})`);
    }
    if (changelogUrl) {
      references.push(`[changelog](${changelogUrl})`);
    }
    upgrade.references = references.join(', ');
    const { fromVersion, toVersion, updateType, versionScheme } = upgrade;
    // istanbul ignore if
    if (updateType === 'minor') {
      try {
        const version = versioning.get(versionScheme);
        if (version.getMinor(fromVersion) === version.getMinor(toVersion)) {
          upgrade.updateType = 'patch';
        }
      } catch (err) {
        // do nothing
      }
    }
    /* eslint-enable no-param-reassign */
  });
}

async function getPrBody(config) {
  massageUpdateMetadata(config);
  const content = {
    banner: getPrBanner(config),
    table: getPrUpdatesTable(config),
    notes: getPrNotes(config) + getPrExtraNotes(config),
    changelogs: getChangelogs(config),
    configDescription: await getPrConfigDescription(config),
    controls: getControls(),
    footer: getPrFooter(config),
  };
  const defaultPrBodyTemplate =
    '{{{banner}}}{{{table}}}{{{notes}}}{{{changelogs}}}{{{configDescription}}}{{{controls}}}{{{footer}}}';
  const prBodyTemplate = config.prBodyTemplate || defaultPrBodyTemplate;
  let prBody = handlebars.compile(prBodyTemplate)(content);
  prBody = prBody.trim();
  prBody = prBody.replace(/\n\n\n+/g, '\n\n');
  prBody = platform.getPrBody(prBody);
  return prBody;
}
