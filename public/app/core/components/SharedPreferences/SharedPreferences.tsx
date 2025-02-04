import { css } from '@emotion/css';
import React, { PureComponent } from 'react';

import { FeatureState, SelectableValue } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { config } from '@grafana/runtime';
import {
  Button,
  Field,
  FieldSet,
  Form,
  Label,
  RadioButtonGroup,
  Select,
  stylesFactory,
  TimeZonePicker,
  WeekStartPicker,
  FeatureBadge,
} from '@grafana/ui';
import { DashboardPicker } from 'app/core/components/Select/DashboardPicker';
import { t, Trans } from 'app/core/internationalization';
import { ENGLISH_US, FRENCH_FRANCE, PSEUDO_LOCALE, SPANISH_SPAIN } from 'app/core/internationalization/constants';
import { PreferencesService } from 'app/core/services/PreferencesService';
import { UserPreferencesDTO } from 'app/types';

export interface Props {
  resourceUri: string;
  disabled?: boolean;
}

export type State = UserPreferencesDTO;

const themes: SelectableValue[] = [
  { value: '', label: t('shared-preferences.theme.default-label', 'Default') },
  { value: 'dark', label: t('shared-preferences.theme.dark-label', 'Dark') },
  { value: 'light', label: t('shared-preferences.theme.light-label', 'Light') },
];

const languages: Array<SelectableValue<string>> = [
  {
    value: '',
    label: t('common.locale.default', 'Default'),
  },
  {
    value: ENGLISH_US,
    label: t('common.locale.en', 'English'),
  },
  {
    value: SPANISH_SPAIN,
    label: t('common.locale.es', 'Spanish'),
  },
  {
    value: FRENCH_FRANCE,
    label: t('common.locale.fr', 'French'),
  },
  // TODO: dev only
  {
    value: PSEUDO_LOCALE,
    label: 'Pseudo-locale', // no need to translate this key
  },
];

const i18nFlag = Boolean(config.featureToggles.internationalization);

export class SharedPreferences extends PureComponent<Props, State> {
  service: PreferencesService;

  constructor(props: Props) {
    super(props);

    this.service = new PreferencesService(props.resourceUri);
    this.state = {
      theme: '',
      timezone: '',
      weekStart: '',
      locale: '',
      queryHistory: { homeTab: '' },
    };
  }

  async componentDidMount() {
    const prefs = await this.service.load();

    this.setState({
      homeDashboardUID: prefs.homeDashboardUID,
      theme: prefs.theme,
      timezone: prefs.timezone,
      weekStart: prefs.weekStart,
      locale: prefs.locale,
      queryHistory: prefs.queryHistory,
    });
  }

  onSubmitForm = async () => {
    const { homeDashboardUID, theme, timezone, weekStart, locale, queryHistory } = this.state;
    await this.service.update({ homeDashboardUID, theme, timezone, weekStart, locale, queryHistory });
    window.location.reload();
  };

  onThemeChanged = (value: string) => {
    this.setState({ theme: value });
  };

  onTimeZoneChanged = (timezone?: string) => {
    if (!timezone) {
      return;
    }
    this.setState({ timezone: timezone });
  };

  onWeekStartChanged = (weekStart: string) => {
    this.setState({ weekStart: weekStart });
  };

  onHomeDashboardChanged = (dashboardUID: string) => {
    this.setState({ homeDashboardUID: dashboardUID });
  };

  onLocaleChanged = (locale: string) => {
    this.setState({ locale });
  };

  render() {
    const { theme, timezone, weekStart, homeDashboardUID, locale } = this.state;
    const { disabled } = this.props;
    const styles = getStyles();

    return (
      <Form onSubmit={this.onSubmitForm}>
        {() => {
          return (
            <FieldSet label={<Trans i18nKey="shared-preferences.title">Preferences</Trans>} disabled={disabled}>
              <Field label={t('shared-preferences.fields.theme-label', 'UI Theme')}>
                <RadioButtonGroup
                  options={themes}
                  value={themes.find((item) => item.value === theme)?.value}
                  onChange={this.onThemeChanged}
                />
              </Field>

              <Field
                label={
                  <Label htmlFor="home-dashboard-select">
                    <span className={styles.labelText}>
                      <Trans i18nKey="shared-preferences.fields.home-dashboard-label">Home Dashboard</Trans>
                    </span>
                  </Label>
                }
                data-testid="User preferences home dashboard drop down"
              >
                <DashboardPicker
                  value={homeDashboardUID}
                  onChange={(v) => this.onHomeDashboardChanged(v?.uid ?? '')}
                  defaultOptions={true}
                  isClearable={true}
                  placeholder={t('shared-preferences.fields.home-dashboard-placeholder', 'Default dashboard')}
                  inputId="home-dashboard-select"
                />
              </Field>

              <Field
                label={t('shared-dashboard.fields.timezone-label', 'Timezone')}
                data-testid={selectors.components.TimeZonePicker.containerV2}
              >
                <TimeZonePicker
                  includeInternal={true}
                  value={timezone}
                  onChange={this.onTimeZoneChanged}
                  inputId="shared-preferences-timezone-picker"
                />
              </Field>

              <Field
                label={t('shared-preferences.fields.week-start-label', 'Week start')}
                data-testid={selectors.components.WeekStartPicker.containerV2}
              >
                <WeekStartPicker
                  value={weekStart}
                  onChange={this.onWeekStartChanged}
                  inputId={'shared-preferences-week-start-picker'}
                />
              </Field>

              {i18nFlag ? (
                <Field
                  label={
                    <Label htmlFor="locale-select">
                      <span className={styles.labelText}>
                        <Trans i18nKey="shared-preferences.fields.locale-label">Language</Trans>
                      </span>
                      <FeatureBadge featureState={FeatureState.alpha} />
                    </Label>
                  }
                  data-testid="User preferences language drop down"
                >
                  <Select
                    value={languages.find((lang) => lang.value === locale)}
                    onChange={(locale: SelectableValue<string>) => this.onLocaleChanged(locale.value ?? '')}
                    options={languages}
                    placeholder={t('shared-preferences.fields.locale-placeholder', 'Choose language')}
                    inputId="locale-select"
                  />
                </Field>
              ) : null}

              <div className="gf-form-button-row">
                <Button
                  type="submit"
                  variant="primary"
                  data-testid={selectors.components.UserProfile.preferencesSaveButton}
                >
                  <Trans i18nKey="common.save">Save</Trans>
                </Button>
              </div>
            </FieldSet>
          );
        }}
      </Form>
    );
  }
}

export default SharedPreferences;

const getStyles = stylesFactory(() => {
  return {
    labelText: css`
      margin-right: 6px;
    `,
  };
});
