import React, { Component } from "react";
import { Router } from "@reach/router";
import NotFound from "./pages/NotFound.js";
import List from "./pages/List.js";
import Request from "./pages/Request";
import Navbar from "./modules/Navbar";
import { get } from "../utilities";

import "../utilities.css";

import { Layout } from "antd";
import "antd/dist/antd.css";
const { Footer } = Layout;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { user: {}, loginAttention: false };
  }

  componentDidMount() {
    get("/api/whoami").then((res) => {
      this.setState({ user: res });
    });
  }

  updateUser = (user) => {
    this.setState({ user });
  };

  render() {
    return (
      <>
        <Layout>
          <Navbar user={this.state.user} updateUser={this.updateUser} />
          <Router primary={false}>
            <List path="/" user={this.state.user} archived={false} />
            <List path="/archives" user={this.state.user} archived={true} />
            <Request path="/request" user={this.state.user} />
            <NotFound default />
          </Router>
          <Footer></Footer>
        </Layout>
      </>
    );
  }
}

export default App;
