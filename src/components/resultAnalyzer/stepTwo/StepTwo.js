import React, { Fragment, useEffect, useState } from "react";
import { createWorker } from "tesseract.js";
import { Field, Form, Formik } from "formik";
import { connect } from "react-redux";
import classnames from "classnames";
import fire from "./../../../firebaseConfig";
import { useHistory } from "react-router-dom";
import firebase from "firebase";

import classes from "./stepTwo.module.scss";
import Backdrop from "./../../UI/backdrop/Backdrop";
import Spinner from "./../../UI/spinner/Spinner";
import MyFormikInput from "./../../../utility/myFormikInput/MyFormikInput";
import Input from "./../../UI/input/Input";
import Button from "./../../UI/button/Button";
import DateInput from "./../../UI/dateInput/DateInput";
import { showFailToast, showSuccessToast } from "./../../../utility/toastify/toastify";
import * as actions from "./../../../actions/index";

const StepTwo = (props) => {
  const history = useHistory();
  const [coverElementIndex, setCoverElementIndex] = useState([]);
  const [patientsNames, setPatientsNames] = useState([...props.patientsNames]);

  const tesseractRecognize = (file) =>
    new Promise((resolve, reject) => {
      const worker = createWorker({
        logger: (m) => {
          // console.log(m);
        },
      });

      (async () => {
        await worker.load();
        await worker.loadLanguage("pol+eng");
        await worker.initialize("pol+eng");
        const result = await worker.recognize(file);
        resolve([...result.data.lines]);
        await worker.terminate();
      })();
    });

  const doOCR = () => {
    Promise.all(props.files.map((file, i) => tesseractRecognize(file))).then((results) => {
      const res = results.map((el) => {
        return el.flat().map((el) => {
          return el.text;
        });
      });
      props.readResultsHandler(res, "diagnostyka");
    });
  };

  useEffect(() => {
    doOCR();
  }, []);

  const resultsForm = props.results?.map((el, index) => {
    return (
      <Formik
        key={index}
        initialValues={{ selectName: "", name: "", date: "", weight: "", kcal: "" }}
        onSubmit={(values) => {
          setCoverElementIndex((currState) => [...currState, index]);
          const name = values.selectName && values.selectName !== "Choose existing patient" ? values.selectName : values.name;
          values.name &&
            setPatientsNames((currState) => {
              console.log("DODALEM");
              return [...currState, values.name];
            });
          firebase.storage().ref(`${props.fireUser.uid}/${values.date}/${index}`).put(props.imagesToStorage[index]);
          if (name) {
            fire
              .database()
              .ref(`${props.fireUser.uid}/patientsResults/${name}/${values.date}/${index}`)
              .set({ results: el, weight: values.weight, kcal: values.kcal, date: values.date })
              .then(() => {
                showSuccessToast("Results have been saved.");
              })
              .catch((error) => {
                showFailToast(error.message);
              });
          } else {
            showFailToast("You need to choose existing patient or add new one.");
          }
        }}
      >
        {({ values }) => {
          const coverCondition = coverElementIndex.find((el) => {
            return el === index;
          });
          return (
            <Form>
              <div className={classnames(coverCondition === index && classes.coverElement)}></div>
              <div className={classes.resultData}>
                {patientsNames.length ? (
                  <Field as="select" name="selectName" disabled={values.name ? true : false} className={classes.selectInput}>
                    <option value={null}>Choose existing patient</option>
                    {patientsNames.map((el) => {
                      return (
                        <option key={el} value={`${el}`}>
                          {el}
                        </option>
                      );
                    })}
                  </Field>
                ) : null}
                {patientsNames.length ? <p>or</p> : null}
                <MyFormikInput
                  as={Input}
                  name="name"
                  disabled={values.selectName && values.selectName !== "Choose existing patient" ? true : false}
                  placeholder="Add new patient"
                  type="text"
                  className={classes.textInput}
                />
                <Field as={DateInput} name="date" required />
              </div>
              <div className={classes.patientData}>
                <MyFormikInput as={Input} name="weight" placeholder="Patients weight" type="number" className={classes.textInput} />
                <MyFormikInput as={Input} name="kcal" placeholder="Amount of eaten calories" type="number" className={classes.textInput} />
              </div>
              <div className={classes.results}>
                {el.map((el, index) => {
                  return (
                    <div className={classes.resultProperty} key={index}>
                      <p>{el.name}</p>
                      <p>{el.value}</p>
                    </div>
                  );
                })}
              </div>
              <Button type="submit" className={classes.button}>
                Submit result
              </Button>
            </Form>
          );
        }}
      </Formik>
    );
  });

  const testResults = props.results ? (
    <div className={classes.resultsContainer}>
      {resultsForm}
      <Button
        className={classes.finishButton}
        type="button"
        onClick={() => {
          props.onAddPatientsNames(patientsNames);
          history.push("/");
        }}
      >
        Finish
      </Button>
    </div>
  ) : null;

  return (
    <Fragment>
      <Backdrop />
      <div className={classes.container}>
        {props.isReadingData && (
          <div className={classes.spinnerContainer}>
            <Spinner />
            <p>Analyzing in progess</p>
            <p>It may take a few minutes</p>
          </div>
        )}
        {testResults}
      </div>
    </Fragment>
  );
};

const mapStateToProps = (state) => {
  return {
    patientsNames: state.patients.patientsNames,
    fireUser: state.auth.fireUser,
  };
};

const mapDisptachToProps = (dispatch) => {
  return {
    onAddPatientsNames: (names) => dispatch(actions.setPatientsNames(names)),
  };
};

export default connect(mapStateToProps, mapDisptachToProps)(StepTwo);