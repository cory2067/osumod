import React, { Component } from "react";
import { Link, Router } from "@reach/router";

import { Layout, Menu } from "antd";
import LoginButton from "./LoginButton";
import { post } from "../../utilities";

const { Header } = Layout;
const { SubMenu } = Menu;

// Navbar + login stuff
class Navbar extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const owner = window.location.pathname.split("/")[1];
    return (
      <>
        <Header>
          {!this.props.home ? (
            <Menu theme="dark" mode="horizontal" selectable={false}>
              <Menu.Item key="0">
                <Link to={`/`}>Home</Link>
              </Menu.Item>
              <Menu.Item key="1">
                <Link to={`/${owner}/`}>Queue</Link>
              </Menu.Item>
              <Menu.Item key="2">
                <Link to={`/${owner}/request`}>Request</Link>
              </Menu.Item>
              <Menu.Item key="3">
                <Link to={`/${owner}/archives`}>Archives</Link>
              </Menu.Item>
              {this.props.user.username === decodeURIComponent(owner) && (
                <Menu.Item key="settings">
                  <Link to={`/${owner}/settings`}>Settings</Link>
                </Menu.Item>
              )}
              <Menu.Item key="4">
                <LoginButton {...this.props} />
              </Menu.Item>
            </Menu>
          ) : (
            <Menu theme="dark" mode="horizontal" selectable={false}>
              <Menu.Item key="1">
                <Link to={`/`}>Home</Link>
              </Menu.Item>
              <Menu.Item key="4">
                <LoginButton {...this.props} />
              </Menu.Item>
            </Menu>
          )}
        </Header>
      </>
    );
  }
}

export default Navbar;
