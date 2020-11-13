import React from 'react'
import { NavLink } from 'react-router-dom'
import classnames from 'classnames'

import classes from './navigationItem.module.scss'

const NavigationItem = props => {
    return <NavLink to={`/${props.text}`} activeClassName={classes.active}>
        <button className={classnames(classes.navigationItem, props.className)}>{props.text}</button>
    </NavLink>
}

export default NavigationItem