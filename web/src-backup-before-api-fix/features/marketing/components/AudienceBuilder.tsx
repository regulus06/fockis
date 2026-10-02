import {
  useState,
} from "react";

import type {
  TargetingDto,
} from "../types/marketingTypes";

interface Props {
  value?: TargetingDto;

  onChange: (
    value: TargetingDto,
  ) => void;
}

function splitValues(
  value: string,
): string[] {
  return value
    .split(",")
    .map((item) =>
      item.trim(),
    )
    .filter(Boolean);
}

export default function AudienceBuilder({
  value = {},
  onChange,
}: Props) {
  const [
    ageMin,
    setAgeMin,
  ] = useState(
    String(value.ageMin ?? ""),
  );

  const [
    ageMax,
    setAgeMax,
  ] = useState(
    String(value.ageMax ?? ""),
  );

  const [
    genders,
    setGenders,
  ] = useState(
    (value.genders ?? []).join(
      ", ",
    ),
  );

  const [
    countries,
    setCountries,
  ] = useState(
    (value.countries ?? []).join(
      ", ",
    ),
  );

  const [
    interests,
    setInterests,
  ] = useState(
    (value.interests ?? []).join(
      ", ",
    ),
  );

  const [
    categories,
    setCategories,
  ] = useState(
    (value.categories ?? []).join(
      ", ",
    ),
  );

  const update = (
    changes: Partial<TargetingDto>,
  ) => {
    onChange({
      ...value,
      ...changes,
    });
  };

  return (
    <div className="fk-audience-builder">
      <h3>
        Audience
      </h3>

      <div className="fk-form-grid">
        <div className="fk-form-field">
          <label>
            Minimum age
          </label>

          <input
            type="number"
            value={ageMin}
            onChange={(event) => {
              setAgeMin(
                event.target.value,
              );

              update({
                ageMin: event.target
                  .value
                  ? Number(
                      event.target.value,
                    )
                  : undefined,
              });
            }}
          />
        </div>

        <div className="fk-form-field">
          <label>
            Maximum age
          </label>

          <input
            type="number"
            value={ageMax}
            onChange={(event) => {
              setAgeMax(
                event.target.value,
              );

              update({
                ageMax: event.target
                  .value
                  ? Number(
                      event.target.value,
                    )
                  : undefined,
              });
            }}
          />
        </div>
      </div>

      <div className="fk-form-field">
        <label>
          Genders
        </label>

        <input
          value={genders}
          onChange={(event) => {
            setGenders(
              event.target.value,
            );

            update({
              genders:
                splitValues(
                  event.target.value,
                ),
            });
          }}
          placeholder="male, female"
        />
      </div>

      <div className="fk-form-field">
        <label>
          Countries
        </label>

        <input
          value={countries}
          onChange={(event) => {
            setCountries(
              event.target.value,
            );

            update({
              countries:
                splitValues(
                  event.target.value,
                ),
            });
          }}
          placeholder="United States, Canada"
        />
      </div>

      <div className="fk-form-field">
        <label>
          Interests
        </label>

        <input
          value={interests}
          onChange={(event) => {
            setInterests(
              event.target.value,
            );

            update({
              interests:
                splitValues(
                  event.target.value,
                ),
            });
          }}
          placeholder="technology, sports, fashion"
        />
      </div>

      <div className="fk-form-field">
        <label>
          Categories
        </label>

        <input
          value={categories}
          onChange={(event) => {
            setCategories(
              event.target.value,
            );

            update({
              categories:
                splitValues(
                  event.target.value,
                ),
            });
          }}
          placeholder="electronics, clothing"
        />
      </div>
    </div>
  );
}