import React, {
  useMemo,
  useState,
} from "react";

interface MortgageCalculatorProps {
  price: number;
}

const MortgageCalculator: React.FC<
  MortgageCalculatorProps
> = ({ price }) => {
  const [downPayment, setDownPayment] =
    useState(price * 0.2);

  const [rate, setRate] = useState(6.5);

  const [years, setYears] = useState(30);

  const monthly = useMemo(() => {
    const principal =
      Math.max(price - downPayment, 0);

    const monthlyRate = rate / 100 / 12;
    const numberOfPayments = years * 12;

    if (monthlyRate === 0) {
      return principal / numberOfPayments;
    }

    return (
      (principal *
        monthlyRate *
        Math.pow(
          1 + monthlyRate,
          numberOfPayments,
        )) /
      (Math.pow(
        1 + monthlyRate,
        numberOfPayments,
      ) - 1)
    );
  }, [price, downPayment, rate, years]);

  return (
    <div className="re-mortgage">
      <div className="re-mortgage__inputs">
        <label>
          <span>Home price</span>
          <input
            value={price}
            readOnly
          />
        </label>

        <label>
          <span>Down payment</span>
          <input
            type="number"
            value={Math.round(
              downPayment,
            )}
            onChange={(event) =>
              setDownPayment(
                Number(event.target.value),
              )
            }
          />
        </label>

        <label>
          <span>Interest rate</span>
          <input
            type="number"
            step="0.1"
            value={rate}
            onChange={(event) =>
              setRate(
                Number(event.target.value),
              )
            }
          />
        </label>

        <label>
          <span>Loan term</span>
          <select
            value={years}
            onChange={(event) =>
              setYears(
                Number(event.target.value),
              )
            }
          >
            <option value={15}>
              15 years
            </option>
            <option value={20}>
              20 years
            </option>
            <option value={30}>
              30 years
            </option>
          </select>
        </label>
      </div>

      <div className="re-mortgage__result">
        <span>Estimated monthly payment</span>

        <strong>
          {monthly.toLocaleString(
            "en-US",
            {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            },
          )}
        </strong>

        <small>
          Principal and interest estimate
        </small>
      </div>
    </div>
  );
};

export default MortgageCalculator;